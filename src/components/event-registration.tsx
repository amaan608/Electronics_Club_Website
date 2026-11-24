import Link from "next/link";
import { currentSession } from "@/lib/member-access";
import { publishedEvent, registrationOf } from "@/lib/events";

type EventRecord = NonNullable<Awaited<ReturnType<typeof publishedEvent>>>;
export function seatsLeft(event: EventRecord) {
  return event.capacity ? Math.max(0, event.capacity - (event.registeredCount ?? 0)) : null;
}
export function statusLabel(event: EventRecord) {
  if (event.registrationStatus === "closed") return "Registration closed";
  if (event.registrationStatus !== "open") return "Registration opens soon";
  return seatsLeft(event) === 0 ? "Full" : "Registration open";
}

// Server-rendered panel: the member's state is read on every request.
export async function EventRegistration({ event }: { event: EventRecord }) {
  const session = await currentSession().catch(() => null);
  const registration = session ? await registrationOf(event._id, session.user.id) : null;
  const registered = registration?.status === "registered";
  const open = event.registrationStatus === "open";
  const left = seatsLeft(event);
  const form = `/events/${event.slug}/register`;
  let body: React.ReactNode;
  if (registered)
    body = <>
      <p>You’re registered{registration?.details?.teamName ? <> with team <strong>{registration.details.teamName}</strong></> : null}.</p>
      <Link className="button" href={form}>{open ? "View or edit registration" : "View registration"}</Link>
    </>;
  else if (!open)
    body = <p>{event.registrationStatus === "closed" ? "Registration for this event has closed." : "Registration hasn’t opened yet. Check the announcements for dates."}</p>;
  else if (left === 0) body = <p>All seats are taken.</p>;
  else if (!session)
    body = <>
      <p>Sign in with your club account to fill in the registration form.</p>
      <Link className="button primary" href={`/login?next=${encodeURIComponent(form)}`}>Sign in to register</Link>
    </>;
  else
    body = <>
      <p>{(event.teamSize ?? 1) > 1 ? `Register your team of ${event.teamSize}. You’ll need your teammates’ names and emails.` : "Fill in a short form to reserve your seat."}</p>
      <Link className="button primary" href={form}>Register now</Link>
    </>;
  return (
    <section className="surface registration-panel" aria-labelledby="registration-title">
      <p className="sup"><span className="square" />{registered ? "Registered" : statusLabel(event)}</p>
      <h2 id="registration-title">Registration</h2>
      {left !== null && open && !registered && left > 0 && <p>{left} {left === 1 ? "seat" : "seats"} left.</p>}
      {body}
    </section>
  );
}
