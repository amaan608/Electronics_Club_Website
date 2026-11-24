"use client";
import { useState } from "react";
export function SignOut() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function leave() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!result.ok) throw new Error();
      window.location.assign("/login");
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button" disabled={busy} onClick={leave}>
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {failed && <p role="alert">Sign-out failed. Please try again.</p>}
    </>
  );
}
