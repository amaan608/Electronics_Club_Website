import Link from "next/link";
import { EventArtwork } from "@/components/event-card";
import { EventRegistration, statusLabel } from "@/components/event-registration";
import { publishedEvent } from "@/lib/events";
import { eventDate } from "@/lib/format";
export const metadata = { title: "Embedded 101" };
export default async function Event() {
  // The database seeds this event on first connection; AdminJS controls its status afterwards.
  const event = await publishedEvent("embedded-101").catch(() => null);
  return (
    <div className="wrap inner-page">
      <div className="crumb">
        <Link href="/events">Events</Link>
        <span>/</span>Embedded 101
      </div>
      <div className="detail-grid">
        <div>
          <p className="sup">
            <span className="square" />
            NATIONAL EDITION
          </p>
          <h1 className="display">
            Embedded
            <br />
            101
          </h1>
          <p className="lede">
            A free online course and competition introducing embedded hardware
            through simulation, teamwork, and a final build.
          </p>
          <div className="actions">
            <Link className="button primary" href="/events/embedded-101/register">Register now</Link>
            <a className="button" href="#registration">Registration details</a>
          </div>
        </div>
        <EventArtwork />
      </div>
      <h2 className="block-title">Event datasheet</h2>
      <dl className="datasheet">
        {[
          ["Format", "Online course and competition"],
          ["Eligibility", "College students across India"],
          ["Team size", "Three participants"],
          ["Learning path", "Learn → Compete → Build"],
          ["Registration", event ? statusLabel(event) : "Dates to be announced"],
          ["Starts", eventDate(event?.startsAt)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {event && <div className="event-registration-row" id="registration"><EventRegistration event={event} /></div>}
    </div>
  );
}
