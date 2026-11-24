import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { readSession } from "@/lib/auth";
import "@fontsource/doto/latin-900.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "./globals.css";

export const metadata: Metadata = {
  icons: {icon:"/art/club-logo.png"},
  title: {
    default: "Electronics Club · IIT Guwahati",
    template: "%s · Electronics Club",
  },
  description:
    "Explore the Electronics Club at IIT Guwahati. Discover embedded systems events, student projects and the team behind the work.",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const hasCookie = jar
    .getAll()
    .some((c) => c.name.endsWith("better-auth.session_token"));
  const session = hasCookie ? await readSession() : null;
  return (
    <html lang="en">
      <body id="top">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Navigation signedIn={!!session} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
