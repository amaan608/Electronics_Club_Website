import { AuthForm } from "@/components/auth-form";
import { redirect } from "next/navigation";
import { returnPath } from "@/lib/return-path";
export const metadata = { title: "Sign in" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = returnPath(params.next);
  if (params.error === "club_profile_required") redirect("/complete-profile?next=" + encodeURIComponent(next));
  const notice =
    params.profile === "expired" ? "Your profile session expired. Continue with Google again." : params.oauth || params.error
      ? "Google sign-in could not be completed. Please try again."
      : params.verified === "1"
        ? "Email verified. Sign in with your new account."
        : params.reset === "1"
          ? "Password updated. Sign in with your new password."
          : "";
  return <AuthForm mode="login" notice={notice} next={next} />;
}
