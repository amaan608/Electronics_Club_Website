"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// Posts the form's fields as JSON. Checkboxes are sent as true/false.
export function AdminForm({
  endpoint,
  children,
  submitLabel,
  successMessage = "Saved.",
  redirectTo,
  reset = false,
  confirm,
  className = "",
  compact = false,
}: {
  endpoint: string;
  children?: ReactNode;
  submitLabel: string;
  successMessage?: string;
  redirectTo?: string;
  reset?: boolean;
  confirm?: string;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const form = event.currentTarget;
    const fields: Record<string, unknown> = Object.fromEntries(new FormData(form));
    form.querySelectorAll<HTMLInputElement>("input[type=checkbox][name]").forEach((box) => {
      fields[box.name] = box.checked;
    });
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Please try again.");
      if (redirectTo) {
        router.push(redirectTo.replace(":id", String(body.id ?? "")));
        router.refresh();
        return;
      }
      if (reset) form.reset();
      setMessage({ ok: true, text: successMessage });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-busy={busy} className={`member-form admin-form ${compact ? "compact" : ""} ${className}`}>
      {children}
      <div className="admin-form-foot">
        <button className={compact ? "button small" : "button primary"} disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {message && (
          <span className={message.ok ? "form-status ok" : "form-status error"} role={message.ok ? "status" : "alert"}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
