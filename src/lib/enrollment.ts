import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { origin } from "./config";
import { database } from "./db";
import { digest, InputError, memberDetails } from "./guards";
import { Account, GoogleEnrollment, User } from "./models";
export const enrollmentCookie = "ec-google-profile";
const cookieOptions = () => ({httpOnly:true, secure:origin().startsWith("https://"), sameSite:"lax" as const, path:"/"});

export async function beginEnrollment(email:string,googleId:string,name:string) {
  const token=randomBytes(32).toString("hex");
  await GoogleEnrollment.create({email,googleId,name,tokenHash:digest("google-profile",token),expiresAt:new Date(Date.now()+600_000)});
  (await cookies()).set(enrollmentCookie,token,{...cookieOptions(),maxAge:600});
}

function activeTicket(token:string) {
  return {tokenHash:digest("google-profile",token),expiresAt:{$gt:new Date()}};
}
export async function pendingEnrollment() {
  const token=(await cookies()).get(enrollmentCookie)?.value;
  if(!token)return null;
  await database();
  return GoogleEnrollment.findOne(activeTicket(token)).select("name email").lean();
}
export async function finishEnrollment(token:string | undefined,data:Record<string,unknown>) {
  if(!token)throw new InputError("Your Google sign-in expired. Continue with Google again.",401);
  const details=memberDetails(data,true);
  const conn=await database();
  return conn.transaction(async session=>{
    const pending=await GoogleEnrollment.findOneAndDelete(activeTicket(token),{session});
    if(!pending)throw new InputError("Your Google sign-in expired. Continue with Google again.",401);
    if(await User.exists({email:pending.email}).session(session))
      throw new InputError("An account now exists for this email. Sign in again.",409);
    const [user]=await User.create([{...details,email:pending.email,emailVerified:true,role:"member"}],{session});
    await Account.create([{userId:user._id,providerId:"google",accountId:pending.googleId}],{session});
    return user._id.toString();
  });
}

