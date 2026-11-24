import { RegisterPage } from "@/components/register-page";
export const metadata = { title: "Register for Embedded 101", robots: { index: false } };
export default function Register() {
  return <RegisterPage slug="embedded-101" />;
}
