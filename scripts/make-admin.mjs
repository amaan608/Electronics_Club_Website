// Grants or removes the administrator role for an existing account.
//   npm run make-admin -- someone@example.com
//   npm run make-admin -- someone@example.com --remove
import mongoose from "mongoose";

const args = process.argv.slice(2);
const remove = args.includes("--remove");
const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run make-admin -- you@example.com [--remove]");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env or .env.local.");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const users = mongoose.connection.db.collection("user");
  const user = await users.findOne({ email }, { projection: { name: 1, role: 1, phone: 1, emailVerified: 1 } });
  if (!user) {
    console.error(`No account uses ${email}. Sign up on the website first, then run this again.`);
    process.exitCode = 1;
  } else {
    const role = remove ? "member" : "admin";
    await users.updateOne({ _id: user._id }, { $set: { role } });
    console.log(`${user.name} (${email}) is now ${remove ? "a member" : "an administrator"}.`);
    if (!remove && (!user.emailVerified || !user.phone))
      console.warn("Note: the admin panel also needs a verified email and a mobile number. Sign in and complete the profile.");
  }
} catch (error) {
  console.error("Could not update the account:", error instanceof Error ? error.message.replace(/\/\/[^@\s/]+@/g, "//<credentials>@") : error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
