import { NextRequest, NextResponse } from "next/server";
import { origin } from "@/lib/config";
import {
  clientIp,
  emailAddress,
  failure,
  InputError,
  requestBody,
} from "@/lib/guards";
import { issueCode, replacePassword, verifyCode } from "@/lib/otp";

export const runtime = "nodejs";
export const maxDuration = 60;
const prefix = "ec-flow-";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const data = await requestBody(req);
    const email = emailAddress(data.email);
    const ip = clientIp(req);
    const result = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    const options = {
      httpOnly: true,
      secure: origin().startsWith("https://"),
      sameSite: "strict" as const,
      path: "/api/member",
    };
    if (action === "password") {
      await replacePassword(
        email,
        req.cookies.get(prefix + "grant")?.value,
        data,
        ip,
      );
      result.cookies.set(prefix + "grant", "", { ...options, maxAge: 0 });
      return result;
    }
    const purpose = data.purpose;
    if (purpose !== "register" && purpose !== "recover")
      throw new InputError("Invalid verification purpose.");
    const cookie = prefix + purpose;
    const binding = req.cookies.get(cookie)?.value;
    if (action === "request") {
      const token = await issueCode(email, purpose, ip, data, binding);
      result.cookies.set(cookie, token, { ...options, maxAge: 1800 });
    } else if (action === "verify") {
      const grant = await verifyCode(email, purpose, ip, data.code, binding);
      result.cookies.set(cookie, "", { ...options, maxAge: 0 });
      if (grant)
        result.cookies.set(prefix + "grant", grant, {
          ...options,
          maxAge: 300,
        });
    } else throw new InputError("Unknown account operation.", 404);
    return result;
  } catch (error) {
    return failure(error);
  }
}
