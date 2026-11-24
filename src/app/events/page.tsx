import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { EventCard } from "@/components/event-card";
import { statusLabel } from "@/components/event-registration";
import { publishedEvents } from "@/lib/events";
import { eventDate } from "@/lib/format";
export const metadata = { title: "Events" };
export default async function Events() {
  const events = await publishedEvents().catch(() => null);
  const others = events?.filter((e) => e.slug !== "embedded-101") ?? [];
  return (
    <div className="wrap inner-page">
      <PageHeading
        section="Events"
        title="Events"
        description="Courses, workshops, and competitions for people who learn by building."
      />
      <EventCard />
      {events === null && <p role="status" className="events-status">Other events are temporarily unavailable.</p>}
      {others.length > 0 && <>
        <h2 className="block-title">Upcoming sessions</h2>
        <div className="catalog">
          {others.map((e) => (
            <article className="catalog-card" key={e.slug}>
              <div className="catalog-copy">
                <p className="sup">{statusLabel(e)}</p>
                <h2>{e.name}</h2>
                <p>{e.summary}</p>
                <div className="tags"><span>{eventDate(e.startsAt)}</span>{e.venue && <span>{e.venue}</span>}</div>
                <Link className="text-link" href={`/events/${e.slug}`}>Event details</Link>
              </div>
            </article>
          ))}
        </div>
      </>}
    </div>
  );
}
