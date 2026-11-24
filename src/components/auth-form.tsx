"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CornerMarks } from "./mark";

type Mode = "login" | "register" | "recover";
type Step = "details" | "code" | "password";
export function AuthForm({
  mode,
  notice = "",
  next = "/account",
}: {
  mode: Mode;
  notice?: string;
  next?: string;
}) {
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(notice);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(
      () => setRemaining((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [remaining]);

  async function post(path: string, body: Record<string, unknown>) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      const wait = Number(res.headers.get("Retry-After"));
      if (wait > 0) setRemaining(wait);
      const detail =
        typeof result.error === "string" ? result.error : result.message;
      throw new Error(
        detail || "Unable to complete the request. Please try again.",
      );
    }
    return result;
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The request failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => {
      if (
        data.confirmPassword !== undefined &&
        data.confirmPassword !== data.password
      )
        throw new Error("The passwords do not match.");
      if (mode === "login") {
        await post("/api/auth/sign-in/email", data);
        window.location.assign(next);
        return;
      }
      if (step === "details") {
        await post("/api/member/request", { ...data, purpose: mode });
        setRemaining(60);
        setStep("code");
        return;
      }
      if (step === "code") {
        await post("/api/member/verify", {
          email,
          purpose: mode,
          code: data.code,
        });
        if (mode === "recover") {
          setStep("password");
          return;
        }
        window.location.assign("/login?verified=1");
        return;
      }
      await post("/api/member/password", { ...data, email });
      window.location.assign("/login?reset=1");
    });
  }
  function google() {
    void run(async () => {
      const result = await post("/api/auth/sign-in/social", { provider: "google", next });
      if (!result.url) throw new Error("Google sign-in could not be started.");
      window.location.assign(result.url);
    });
  }
  function resend() {
    void run(async () => {
      await post("/api/member/request", { email, purpose: mode, resend: true });
      setRemaining(60);
      setMessage("If this email is eligible, a new code is on its way.");
    });
  }
  const title =
    step === "code"
      ? "Verify email"
      : step === "password"
        ? "New password"
        : mode === "register"
          ? "Join the club"
          : mode === "recover"
            ? "Reset password"
            : "Sign in";
  const action =
    step === "code"
      ? "Verify code"
      : step === "password"
        ? "Save new password"
        : mode === "register"
          ? "Send verification code"
          : mode === "recover"
            ? "Send recovery code"
            : "Sign in";
  return (
    <div className="auth-wrap">
      <section className="auth-panel" aria-labelledby="auth-title">
        <CornerMarks />
        <p className="sup">
          <span className="square" />
          MEMBER ACCESS
        </p>
        <h1 id="auth-title" className="display">
          {title}
        </h1>
        <p>
          {step === "code"
            ? `If ${email} is eligible, a six-digit code will arrive by email. It expires in five minutes.`
            : step === "password"
              ? "Your email is verified. Choose a new password for your account."
              : mode === "login"
                ? "Sign in to your Electronics Club account."
                : mode === "register"
                  ? "Create your member account with a verified email address."
                  : "Enter your account email to request a recovery code."}
        </p>
        <form key={step} onSubmit={submit} aria-busy={busy}>
          {step === "details" && mode === "register" && (
            <label className="field">
              Full name
              <input name="name" autoComplete="name" required maxLength={120} />
            </label>
          )}
          {step === "details" && (
            mode === "register" && <label className="field">Mobile number
              <input name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" maxLength={24} required />
            </label>
          )}
          {step === "details" && (
            <label className="field">
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          {((step === "details" && mode !== "recover") ||
            step === "password") && (
            <label className="field">
              {step === "password" ? "New password" : "Password"}
              <input
                type="password"
                name="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "login" ? 1 : 10}
                maxLength={128}
                required
              />
              {mode !== "login" && <small>10–128 characters</small>}
            </label>
          )}
          {((step === "details" && mode === "register") ||
            step === "password") && (
            <label className="field">
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
              />
            </label>
          )}
          {step === "code" && (
            <label className="field">
              Verification code
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                minLength={6}
                required
                autoFocus
              />
            </label>
          )}
          {mode === "login" && (
            <div className="form-meta">
              <Link href="/forgot-password">Forgot password?</Link>
            </div>
          )}
          {message && (
            <p role="status" aria-live="polite" className="feedback">
              {message}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Working…" : action}
          </button>
        </form>
        {step === "code" && (
          <>
            <button
              className="link-button"
              disabled={busy || remaining > 0}
              onClick={resend}
            >
              {remaining ? `Resend in ${remaining}s` : "Resend code"}
            </button>
            <div>
              <button
                className="link-button"
                disabled={busy}
                onClick={() => {
                  setStep("details");
                  setMessage("");
                }}
              >
                Start again
              </button>
            </div>
          </>
        )}
        {mode !== "recover" && step === "details" && (
          <>
            <div className="divider">OR</div>
            <button className="button" disabled={busy} onClick={google}>
              <b aria-hidden="true">G</b> Continue with Google
            </button>
          </>
        )}
        {mode === "login" ? (
          <p className="form-foot">
            New to the club? <Link href="/register">Create an account</Link>
          </p>
        ) : (
          <p className="form-foot">
            <Link href="/login">Back to sign in</Link>
          </p>
        )}
      </section>
    </div>
  );
}
