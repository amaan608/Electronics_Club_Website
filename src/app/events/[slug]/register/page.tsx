import { RegisterPage } from "@/components/register-page";
export const metadata = { title: "Event registration", robots: { index: false } };
export default async function Register({ params }: PageProps<"/events/[slug]/register">) {
  return <RegisterPage slug={(await params).slug} />;
}
