import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { headers } from "next/headers";
import { database } from "./db";
import { origin, secret } from "./config";
import { beginEnrollment } from "./enrollment";
import { profilePlugin } from "./profile-plugin";

async function configureAuth() {
  const conn = await database();
  const google =
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {};
  return betterAuth({
    appName: "Electronics Club",
    baseURL: origin(),
    secret: secret(),
    database: mongodbAdapter(conn.db!, { client: conn.getClient() }),
    socialProviders: google,
    plugins: [profilePlugin],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    user: {
      async validateUserInfo({ user, source }) {
        if (source.oauth?.providerId !== "google") return;
        if (user.emailVerified !== true) return { error: "unverified_google_email" };
        if (source.action !== "create-user") return;
        const subject = source.oauth.profile?.sub;
        if (!user.email || typeof subject !== "string" || !subject)
          return { error: "invalid_google_identity" };
        await beginEnrollment(user.email, subject, user.name ?? "");
        return { error: "club_profile_required" };
      },
      additionalFields: {
        role: { type: "string", defaultValue: "member", input: false },
        phone: { type: "string", required: false, input: false },
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        requireLocalEmailVerified: true,
        trustedProviders: [],
      },
      encryptOAuthTokens: true,
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 75 },
    advanced: {
      useSecureCookies: origin().startsWith("https://"),
      ipAddress: {
        ipAddressHeaders: process.env.VERCEL ? ["x-vercel-forwarded-for"] : [],
      },
    },
    onAPIError: { errorURL: origin() + "/login?oauth=error" },
    logger: { disabled: true },
  });
}
let instance: ReturnType<typeof configureAuth> | undefined;
export function auth() {
  return (instance ??= configureAuth().catch((error) => {
    instance = undefined;
    throw error;
  }));
}
export async function readSession() {
  return (await auth()).api.getSession({ headers: await headers() });
}
