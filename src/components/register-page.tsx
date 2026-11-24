import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentSession } from "@/lib/member-access";
import { eventSlug } from "@/lib/community-models";
import { publishedEvent, registrationOf, studyYears } from "@/lib/events";
import { eventDate } from "@/lib/format";
import { RegistrationForm } from "./registration-form";
import { seatsLeft, statusLabel } from "./event-registration";
import { CornerMarks } from "./mark";

// Shared by /events/[slug]/register and the static Embedded 101 route. Members must be signed in.
export async function RegisterPage({ slug }: { slug: string }) {
  if (!eventSlug.test(slug)) notFound();
  const here = `/events/${slug}/register`;
  const session = await currentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(here)}`);
  if (!session.user.phone) redirect(`/complete-profile?next=${encodeURIComponent(here)}`);
  const event = await publishedEvent(slug);
  if (!event) notFound();
  const registration = await registrationOf(event._id, session.user.id);
  const registered = registration?.status === "registered";
  const open = event.registrationStatus === "open";
  const left = seatsLeft(event);
  const teamSize = event.teamSize ?? 1;
  return (
    <div className="wrap inner-page">
      <div className="crumb">
        <Link href="/events">Events</Link>
        <span>/</span>
        <Link href={`/events/${slug}`}>{event.name}</Link>
        <span>/</span>
        Register
      </div>
      <div className="register-layout">
        <section className="surface register-main" aria-labelledby="register-title">
          <p className="sup"><span className="square" />{registered ? "Registered" : statusLabel(event)}</p>
          <h1 id="register-title" className="display register-title">{registered ? "Your registration" : "Register"}</h1>
          {registered && <p className="register-note">You’re registered for {event.name}. You can update your details or cancel while registration is open.</p>}
          {open && (registered || left !== 0) ? (
            <RegistrationForm slug={slug} teamSize={teamSize} years={studyYears} initial={registration?.details} registered={registered} />
          ) : (
            <p className="register-note">
              {!open
                ? event.registrationStatus === "closed"
                  ? "Registration for this event has closed."
                  : "Registration hasn’t opened yet. Check the announcements for dates."
                : "All seats are taken."}
              {registered && " Contact the club through Queries to change your registration."}
            </p>
          )}
        </section>
        <aside className="register-side">
          <section className="surface">
            <CornerMarks />
            <p className="sup">Event</p>
            <h2>{event.name}</h2>
            <dl className="mini-sheet">
              <div><dt>When</dt><dd>{eventDate(event.startsAt)}</dd></div>
              {event.venue && <div><dt>Where</dt><dd>{event.venue}</dd></div>}
              {teamSize > 1 && <div><dt>Team size</dt><dd>{teamSize} members</dd></div>}
              {left !== null && <div><dt>Seats left</dt><dd>{left}</dd></div>}
            </dl>
          </section>
          <section className="surface">
            <p className="sup">Registering as</p>
            <h2>{session.user.name}</h2>
            <dl className="mini-sheet">
              <div><dt>Email</dt><dd>{session.user.email}</dd></div>
              <div><dt>Mobile</dt><dd>{session.user.phone}</dd></div>
            </dl>
            <Link className="text-link" href="/account#profile">Edit profile</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
