"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Mark } from "./mark";

const links = [
  ["/", "Home"],
  ["/events", "Events"],
  ["/team", "Team"],
  ["/projects", "Projects"],
  ["/queries", "Queries"],
];

export function Navigation({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const account = (
    <Link
      className="sign-link"
      href={signedIn ? "/account" : "/login"}
      onClick={() => setOpen(false)}
    >
      <span className="terminal-prompt" aria-hidden="true">
        ›_
      </span>
      {signedIn ? "My account" : "Sign in"}
    </Link>
  );
  return (
    <header className="topbar">
      <div className="wrap bar-inner">
        <Link
          className="brand"
          href="/"
          onClick={() => setOpen(false)}
          aria-label="Electronics Club home"
        >
          <Mark />
          <span>
            Electronics Club<small>IIT GUWAHATI</small>
          </span>
        </Link>
        <button
          className="menu-switch"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav
          id="primary-nav"
          className={open ? "nav open" : "nav"}
          aria-label="Primary navigation"
        >
          {links.map(([href, label]) => (
            <Link
              href={href}
              key={href}
              aria-current={
                (href === "/" ? path === href : path.startsWith(href))
                  ? "page"
                  : undefined
              }
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <span className="mobile-account">{account}</span>
        </nav>
        <span className="desktop-account">{account}</span>
      </div>
    </header>
  );
}
