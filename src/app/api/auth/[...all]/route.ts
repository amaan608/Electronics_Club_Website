import { auth } from "@/lib/auth";
import {
  clientIp,
  emailAddress,
  failure,
  InputError,
  rateLimit,
  requestBody,
} from "@/lib/guards";
import { database } from "@/lib/db";
import { returnPath } from "@/lib/return-path";

export const runtime = "nodejs";
type Context = { params: Promise<{ all: string[] }> };
const missing = () =>
  Response.json(
    { error: "Unknown authentication operation." },
    { status: 404 },
  );
export async function GET(req: Request, { params }: Context) {
  const path = (await params).all.join("/");
  if (!["callback/google", "get-session", "error"].includes(path))
    return missing();
  try {
    return await (await auth()).handler(req);
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: Request, { params }: Context) {
  const path = (await params).all.join("/");
  if (!["sign-in/email", "sign-in/social", "sign-out", "complete-profile"].includes(path))
    return missing();
  try {
    const input = await requestBody(req);
    let body: Record<string, unknown> = {};
    if (path === "complete-profile") body = { name: input.name, confirmName: input.confirmName, phone: input.phone };
    if (path === "sign-in/social") {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
        throw new InputError(
          "Google sign-in has not been configured yet.",
          503,
        );
      const next = returnPath(input.next);
      body = {
        provider: "google",
        callbackURL: next,
        errorCallbackURL: "/login?oauth=error" + (next === "/account" ? "" : "&next=" + encodeURIComponent(next)),
      };
    }
    if (path === "sign-in/email") {
      const email = emailAddress(input.email);
      if (
        typeof input.password !== "string" ||
        !input.password ||
        input.password.length > 128
      )
        throw new InputError("Enter your email address and password.");
      await database();
      await rateLimit("login-ip:" + clientIp(req), 40, 900);
      await rateLimit("login-email:" + email, 12, 900);
      body = { email, password: input.password, rememberMe: true };
    }
    const headers = new Headers(req.headers);
    headers.delete("content-length");
    return await (
      await auth()
    ).handler(
      new Request(req.url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
