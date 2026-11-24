import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { after } from "next/server";
import { database } from "./db";
import { Account, Challenge, User } from "./models";
import { deliverCode, type Purpose } from "./mail";
import { digest, InputError, memberDetails, passwordFields, rateLimit } from "./guards";

const minute = 60_000;
const lifetime = 5 * minute;
const maxAttempts = 5;
const invalidCode = () =>
  new InputError(
    "The code is incorrect or expired. Check the code or request a new one.",
  );
function duplicate(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  );
}

export async function issueCode(
  email: string,
  purpose: Purpose,
  ip: string,
  data: Record<string, unknown>,
  existingBinding?: string,
) {
  await database();
  await rateLimit("otp-ip:" + ip, 30, 900);
  await rateLimit("otp-email:" + email, 6, 900);
  const resend = data.resend === true;
  const now = Date.now();
  const binding = resend ? existingBinding : randomBytes(32).toString("hex");
  if (!binding) throw new InputError("Start the form again to request a code.");
  let pendingName: string | undefined;
  let pendingPhone: string | undefined;
  let pendingPasswordHash: string | undefined;
  if (purpose === "register" && !resend) {
    const details = memberDetails(data);
    pendingName = details.name;
    pendingPhone = details.phone;
    pendingPasswordHash = await hashPassword(passwordFields(data));
  }
  const previous = await Challenge.findOne({ email, purpose }).lean();
  if (previous && previous.sentAt.getTime() + minute > now) {
    const seconds = Math.ceil(
      (previous.sentAt.getTime() + minute - now) / 1000,
    );
    throw new InputError(
      `Wait ${seconds} seconds before requesting another code.`,
      429,
      seconds,
    );
  }
  const bindingHash = digest("browser", binding);
  if (
    resend &&
    (!previous ||
      previous.binding !== bindingHash ||
      previous.verified ||
      previous.cleanupAt.getTime() <= now)
  )
    throw new InputError(
      "This verification session has ended. Start the form again.",
    );
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const otpHash = digest("otp", purpose, email, binding, code);
  try {
    const updated = await Challenge.findOneAndUpdate(
      {
        email,
        purpose,
        sentAt: { $lte: new Date(now - minute) },
        ...(resend ? { binding: bindingHash, verified: false } : {}),
      },
      {
        $set: {
          binding: bindingHash,
          otpHash,
          attempts: 0,
          verified: false,
          sentAt: new Date(now),
          expiresAt: new Date(now + lifetime),
          cleanupAt: new Date(now + 30 * minute),
          ...(pendingPasswordHash ? { pendingName, pendingPhone, pendingPasswordHash } : {}),
        },
        $unset: { grantHash: 1, grantExpiresAt: 1 },
      },
      { upsert: !resend, new: true, runValidators: true },
    );
    if (!updated)
      throw new InputError(
        "A newer code was requested. Please try again.",
        429,
        60,
      );
  } catch (error) {
    if (duplicate(error))
      throw new InputError(
        "Please wait before requesting another code.",
        429,
        60,
      );
    throw error;
  }

  // Waiting for SMTP only after returning keeps delivery time out of the account-existence signal.
  after(async () => {
    try {
      const user = await User.findOne({ email })
        .select("_id emailVerified")
        .lean();
      const eligible =
        purpose === "register"
          ? !user
          : user?.emailVerified &&
            (await Account.exists({
              userId: user._id,
              providerId: "credential",
            }));
      if (eligible) await deliverCode(email, purpose, code);
    } catch {
      await Challenge.updateOne(
        { email, purpose, otpHash },
        { $unset: { otpHash: 1 } },
      );
      console.error("Transactional mail could not be delivered.");
    }
  });
  return binding;
}

export async function verifyCode(
  email: string,
  purpose: Purpose,
  ip: string,
  code: unknown,
  binding?: string,
) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code) || !binding)
    throw invalidCode();
  const conn = await database();
  await rateLimit("verify-ip:" + ip, 60, 900);
  const otpHash = digest("otp", purpose, email, binding, code);
  const grant = randomBytes(32).toString("hex");
  const result = await conn.transaction(async (session) => {
    const base = {
      email,
      purpose,
      binding: digest("browser", binding),
      verified: false,
      attempts: { $lt: maxAttempts },
      expiresAt: { $gt: new Date() },
    };
    const challenge = await Challenge.findOneAndUpdate(
      { ...base, otpHash },
      {
        $set: {
          verified: true,
          ...(purpose === "recover"
            ? {
                grantHash: digest("grant", grant),
                grantExpiresAt: new Date(Date.now() + lifetime),
              }
            : {}),
        },
        $unset: { otpHash: 1 },
      },
      { new: true, session },
    );
    if (!challenge) {
      await Challenge.updateOne(
        { ...base, otpHash: { $exists: true, $ne: otpHash } },
        { $inc: { attempts: 1 } },
        { session },
      );
      return false;
    }
    if (purpose === "register") {
      if (!challenge.pendingName || !challenge.pendingPasswordHash)
        throw invalidCode();
      if (!challenge.pendingPhone)
        throw new InputError("Please start registration again to add your mobile number.");
      // Google may have created this mailbox's account while the code was in transit.
      if (await User.exists({ email }).session(session)) return false;
      const [user] = await User.create(
        [
          {
            name: challenge.pendingName,
            phone: challenge.pendingPhone,
            email,
            emailVerified: true,
            role: "member",
          },
        ],
        { session },
      );
      await Account.create(
        [
          {
            userId: user._id,
            accountId: user._id.toString(),
            providerId: "credential",
            password: challenge.pendingPasswordHash,
          },
        ],
        { session },
      );
      await Challenge.deleteOne({ _id: challenge._id }, { session });
    }
    return true;
  });
  if (!result) throw invalidCode();
  return purpose === "recover" ? grant : null;
}

export async function replacePassword(
  email: string,
  grant: string | undefined,
  data: Record<string, unknown>,
  ip: string,
) {
  if (!grant)
    throw new InputError(
      "Verify a recovery code to change your password.",
      403,
    );
  const conn = await database();
  await rateLimit("password-ip:" + ip, 20, 900);
  const password = passwordFields(data);
  const claim = {
    email,
    purpose: "recover" as const,
    verified: true,
    grantHash: digest("grant", grant),
    grantExpiresAt: { $gt: new Date() },
  };
  if (!(await Challenge.exists(claim)))
    throw new InputError(
      "Recovery authorization expired. Request another code.",
      403,
    );
  const hashed = await hashPassword(password);
  await conn.transaction(async (session) => {
    const authorization = await Challenge.findOneAndDelete(
      { ...claim, grantExpiresAt: { $gt: new Date() } },
      { session },
    );
    if (!authorization)
      throw new InputError(
        "Recovery authorization expired. Request another code.",
        403,
      );
    const user = await User.findOne({ email, emailVerified: true }).session(
      session,
    );
    if (!user) throw new InputError("Recovery authorization is invalid.", 403);
    const result = await Account.updateOne(
      { userId: user._id, providerId: "credential" },
      { $set: { password: hashed } },
      { session },
    );
    if (!result.matchedCount)
      throw new InputError("Recovery authorization is invalid.", 403);
    await conn
      .db!.collection("session")
      .deleteMany({ userId: user._id }, { session });
  });
}
