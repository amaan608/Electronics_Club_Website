import Link from "next/link";
import { notFound } from "next/navigation";
import { EventRegistration, statusLabel } from "@/components/event-registration";
import { eventSlug } from "@/lib/community-models";
import { publishedEvent } from "@/lib/events";
import { eventDate } from "@/lib/format";

async function load(params: PageProps<"/events/[slug]">["params"]) {
  const { slug } = await params;
  return eventSlug.test(slug) ? publishedEvent(slug) : null;
}
export async function generateMetadata({ params }: PageProps<"/events/[slug]">) {
  const event = await load(params).catch(() => null);
  return { title: event?.name ?? "Event", description: event?.summary };
}
export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const event = await load(params);
  if (!event) notFound();
  return (
    <div className="wrap inner-page">
      <div className="crumb">
        <Link href="/events">Events</Link>
        <span>/</span>
        {event.name}
      </div>
      <div className="detail-grid event-detail">
        <div>
          <p className="sup"><span className="square" />{statusLabel(event)}</p>
          <h1 className="display">{event.name}</h1>
          <p className="lede">{event.summary}</p>
        </div>
        <EventRegistration event={event} />
      </div>
      <h2 className="block-title">Event datasheet</h2>
      <dl className="datasheet">
        <div><dt>When</dt><dd>{eventDate(event.startsAt)}</dd></div>
        {event.venue && <div><dt>Where</dt><dd>{event.venue}</dd></div>}
        {event.capacity && <div><dt>Seats</dt><dd>{event.capacity}</dd></div>}
        {event.description && <div><dt>About</dt><dd className="prose">{event.description}</dd></div>}
      </dl>
    </div>
  );
}
