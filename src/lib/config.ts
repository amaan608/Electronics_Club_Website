import "server-only";

export function setting(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server setting: ${name}`);
  return value;
}

export function secret() {
  const value = setting("BETTER_AUTH_SECRET");
  if (Buffer.byteLength(value) < 32)
    throw new Error("Configure an authentication secret of at least 32 bytes.");
  return value;
}

export function origin() {
  const url = new URL(setting("BETTER_AUTH_URL"));
  if (process.env.VERCEL && url.protocol !== "https:")
    throw new Error("Configure an HTTPS application URL.");
  return url.origin;
}
