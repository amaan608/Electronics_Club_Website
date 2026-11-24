import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

function model<S extends Schema>(
  name: string,
  schema: S,
  collection: string,
): Model<InferSchemaType<S>> {
  return mongoose.models[name] ?? mongoose.model(name, schema, collection);
}
const timestamps = { timestamps: true };
const email = {
  type: String,
  required: true,
  lowercase: true,
  trim: true,
  maxlength: 254,
} as const;

const userSchema = new Schema(
  {
    email,
    name: { type: String, required: true, maxlength: 120 },
    phone: { type: String, maxlength: 16 },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["member", "admin"], default: "member" },
    image: String,
  },
  timestamps,
);
userSchema.index({ email: 1 }, { unique: true });
export const User = model("ClubUser", userSchema, "user");

// Better Auth keeps provider credentials separate so one user can link multiple providers.
const accountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "ClubUser" },
    accountId: { type: String, required: true },
    providerId: { type: String, required: true },
    password: { type: String, select: false },
  },
  timestamps,
);
accountSchema.index({ providerId: 1, accountId: 1 }, { unique: true });
export const Account = model("ClubAccount", accountSchema, "account");

const otpSchema = new Schema(
  {
    email,
    purpose: { type: String, enum: ["register", "recover"], required: true },
    otpHash: String,
    binding: { type: String, required: true },
    attempts: { type: Number, min: 0, default: 0 },
    verified: { type: Boolean, default: false },
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    cleanupAt: { type: Date, required: true },
    pendingName: String,
    pendingPhone: String,
    pendingPasswordHash: String,
    grantHash: String,
    grantExpiresAt: Date,
  },
  timestamps,
);
otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });
export const Challenge = model("OtpChallenge", otpSchema, "otp_verifications");
const enrollmentSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  email, googleId: { type: String, required: true }, name: String,
  expiresAt: { type: Date, required: true, expires: 0 },
});
export const GoogleEnrollment = model("GoogleEnrollment", enrollmentSchema, "google_enrollments");
const limitSchema = new Schema({
  _id: String,
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
limitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateBucket = model("RateBucket", limitSchema, "request_limits");
