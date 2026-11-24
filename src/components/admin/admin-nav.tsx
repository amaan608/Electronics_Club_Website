"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/admin", "Overview"],
  ["/admin/events", "Events"],
  ["/admin/registrations", "Registrations"],
  ["/admin/queries", "Queries"],
  ["/admin/announcements", "Announcements"],
  ["/admin/team", "Team"],
  ["/admin/projects", "Projects"],
  ["/admin/members", "Members"],
] as const;
export function AdminNav({ openQueries }: { openQueries: number }) {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Admin sections">
      {links.map(([href, label]) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            {label}
            {href === "/admin/queries" && openQueries > 0 && <span className="count">{openQueries}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
