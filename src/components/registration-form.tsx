"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Details = {
  college?: string | null;
  year?: string | null;
  teamName?: string | null;
  teammates?: { name: string; email: string }[] | null;
};
export function RegistrationForm({
  slug,
  teamSize,
  years,
  initial,
  registered,
}: {
  slug: string;
  teamSize: number;
  years: readonly string[];
  initial?: Details | null;
  registered: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "save" | "cancel">("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const mates = Array.from({ length: Math.max(0, teamSize - 1) }, (_, i) => initial?.teammates?.[i]);

  async function send(body: Record<string, unknown>) {
    const response = await fetch(`/api/events/${slug}/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Please try again.");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    setBusy("save");
    setMessage("");
    setSaved(false);
    try {
      await send({
        intent: "register",
        college: value("college"),
        year: value("year"),
        ...(teamSize > 1 && {
          teamName: value("teamName"),
          teammates: mates.map((_, i) => ({ name: value(`mate${i}Name`), email: value(`mate${i}Email`) })),
        }),
      });
      setSaved(true);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  async function cancel() {
    if (!window.confirm("Cancel your registration? Your seat will be released.")) return;
    setBusy("cancel");
    setMessage("");
    try {
      await send({ intent: "cancel" });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  return (
    <form className="member-form registration-form" onSubmit={submit} aria-busy={!!busy}>
      <fieldset>
        <legend>Academic details</legend>
        <div className="form-row">
          <label className="field">
            College or institute
            <input name="college" required maxLength={160} autoComplete="organization" defaultValue={initial?.college ?? ""} />
          </label>
          <label className="field">
            Year of study
            <select name="year" required defaultValue={initial?.year ?? ""}>
              <option value="" disabled>Choose…</option>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
        </div>
      </fieldset>
      {teamSize > 1 && (
        <fieldset>
          <legend>Your team</legend>
          <p className="form-hint">Teams have {teamSize} members: you and {teamSize - 1} teammates. Each person needs a different email address.</p>
          <label className="field">
            Team name
            <input name="teamName" required maxLength={80} defaultValue={initial?.teamName ?? ""} />
          </label>
          {mates.map((mate, i) => (
            <div className="form-row teammate" key={i}>
              <label className="field">
                {`Teammate ${i + 1} name`}
                <input name={`mate${i}Name`} required maxLength={120} defaultValue={mate?.name ?? ""} />
              </label>
              <label className="field">
                {`Teammate ${i + 1} email`}
                <input name={`mate${i}Email`} type="email" required maxLength={254} defaultValue={mate?.email ?? ""} />
              </label>
            </div>
          ))}
        </fieldset>
      )}
      {message && <p className="feedback" role="alert">{message}</p>}
      {saved && <p className="feedback success" role="status">{registered ? "Your registration is saved." : "You’re registered."}</p>}
      <div className="actions">
        <button className="button primary" disabled={!!busy}>
          {busy === "save" ? "Saving…" : registered ? "Update registration" : "Submit registration"}
        </button>
        {registered && (
          <button type="button" className="button" disabled={!!busy} onClick={cancel}>
            {busy === "cancel" ? "Cancelling…" : "Cancel registration"}
          </button>
        )}
      </div>
    </form>
  );
}
