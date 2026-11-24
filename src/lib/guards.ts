import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { origin, secret } from "./config";
import { RateBucket } from "./models";

export class InputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}
export function digest(...parts: string[]) {
  return createHmac("sha256", secret())
    .update(JSON.stringify(parts))
    .digest("hex");
}
export function clientIp(req: Request) {
  // Vercel sets this header at the edge. Local clients share one conservative bucket.
  const ip = process.env.VERCEL
    ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
    : undefined;
  return ip && isIP(ip) ? ip : "local";
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const expiresAt = new Date((bucket + 1) * seconds * 1000);
  const id = digest("limit", key, String(bucket));
  const counter = await RateBucket.findByIdAndUpdate(
    id,
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, new: true },
  );
  if (counter.count > limit)
    throw new InputError(
      "Too many requests. Please try again later.",
      429,
      Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
    );
}
export function emailAddress(value: unknown) {
  if (typeof value !== "string")
    throw new InputError("Enter a valid email address.");
  const email = value.trim().toLowerCase();
  if (
    email.length > 254 ||
    !/^[a-z0-9_+'%.-]+@[a-z0-9.-]+\.[a-z]{2,63}$/i.test(email) ||
    email.includes("..")
  )
    throw new InputError("Enter a valid email address.");
  return email;
}
export function passwordFields(data: Record<string, unknown>) {
  if (
    typeof data.password !== "string" ||
    data.password.length < 10 ||
    data.password.length > 128
  )
    throw new InputError("Use a password between 10 and 128 characters.");
  if (data.password !== data.confirmPassword)
    throw new InputError("The passwords do not match.");
  return data.password;
}
export function memberDetails(data: Record<string, unknown>, confirmName = false) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length > 120) throw new InputError("Enter your full name (up to 120 characters).");
  if (confirmName && (typeof data.confirmName !== "string" || data.confirmName.trim() !== name))
    throw new InputError("The two names must match.");
  const digits = typeof data.phone === "string" ? data.phone.trim().replace(/[ ()-]/g, "") : "";
  const phone = /^\d{10}$/.test(digits) ? "+91" + digits : digits;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new InputError("Enter a 10-digit Indian mobile number or include your country code.");
  return { name, phone };
}
export async function requestBody(
  req: Request,
): Promise<Record<string, unknown>> {
  if (req.headers.get("origin") !== origin())
    throw new InputError("This request could not be verified.", 403);
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new InputError("Expected a JSON request.", 415);
  const reader = req.body?.getReader();
  if (!reader) throw new InputError("Missing request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new InputError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (data && typeof data === "object" && !Array.isArray(data)) return data;
  } catch {}
  throw new InputError("Invalid request body.");
}
// Strips credentials from connection strings that some driver errors echo back.
function redacted(text: string) {
  return text.replace(/(\w+(?:\+\w+)?:\/\/)[^@\s/]+@/g, "$1<credentials>@");
}
export function failure(error: unknown) {
  const known = error instanceof InputError;
  if (!known) {
    // The client only sees a generic 503, so record the cause on the server.
    if (process.env.NODE_ENV === "production")
      console.error("Request failed:", error instanceof Error ? error.name : "UnknownError");
    else
      console.error("Request failed:", redacted(error instanceof Error ? error.stack ?? error.message : String(error)));
  }
  return Response.json(
    {
      error: known
        ? error.message
        : "Account services are temporarily unavailable. Please try again later.",
    },
    {
      status: known ? error.status : 503,
      headers: {
        "Cache-Control": "no-store",
        ...(known && error.retryAfter
          ? { "Retry-After": String(error.retryAfter) }
          : {}),
      },
    },
  );
}
