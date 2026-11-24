import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { Announcement, ClubEvent, EventRegistration, MemberQuery } from "@/lib/community-models";
import { AdminHeading } from "@/components/admin/admin-heading";
import { eventDate } from "@/lib/format";

export const metadata = { title: "Overview" };
export default async function AdminHome() {
  await requireAdminPage();
  const [openQueries, registered, events, published, waiting] = await Promise.all([
    MemberQuery.countDocuments({ reply: { $exists: false } }),
    EventRegistration.countDocuments({ status: "registered" }),
    ClubEvent.find().sort({ startsAt: -1, createdAt: -1 }).select("name slug startsAt registeredCount capacity registrationStatus published").lean(),
    Announcement.countDocuments({ published: true }),
    MemberQuery.find({ reply: { $exists: false } }).sort({ createdAt: 1 }).limit(5).select("subject name createdAt").lean(),
  ]);
  const openEvents = events.filter((e) => e.published && e.registrationStatus === "open");
  return (
    <>
      <AdminHeading title="Overview" description="What needs attention across the club desk." />
      <dl className="account-stats admin-stats">
        <div><dt>Queries awaiting reply</dt><dd>{openQueries}</dd></div>
        <div><dt>Active registrations</dt><dd>{registered}</dd></div>
        <div><dt>Events open</dt><dd>{openEvents.length}</dd></div>
        <div><dt>Live announcements</dt><dd>{published}</dd></div>
      </dl>
      <div className="account-grid">
        <section className="surface account-card">
          <p className="sup"><span className="slash">//</span> INBOX</p>
          <h2>Oldest unanswered queries</h2>
          {waiting.length ? (
            <ul className="account-list">
              {waiting.map((q) => (
                <li key={String(q._id)}>
                  <div>
                    <span className="item-title">{q.subject}</span>
                    <span className="item-meta">
                      {q.name} · {q.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                    </span>
                  </div>
                  <Link className="text-link" href={`/admin/queries#q-${q._id}`}>Reply</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Every query has a reply.</p>
          )}
          <Link className="text-link" href="/admin/queries">All queries</Link>
        </section>
        <section className="surface account-card">
          <p className="sup"><span className="slash">//</span> EVENTS</p>
          <h2>Events</h2>
          {events.length ? (
            <ul className="account-list">
              {events.slice(0, 6).map((e) => (
                <li key={String(e._id)}>
                  <div>
                    <Link className="item-title" href={`/admin/events/${e._id}`}>{e.name}</Link>
                    <span className="item-meta">
                      {eventDate(e.startsAt)} · {e.registeredCount ?? 0}{e.capacity ? ` / ${e.capacity}` : ""} registered
                    </span>
                  </div>
                  <span className={e.published && e.registrationStatus === "open" ? "badge" : "badge muted"}>
                    {e.published ? e.registrationStatus : "draft"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No events yet.</p>
          )}
          <div className="card-actions">
            <Link className="button" href="/admin/events/new">New event</Link>
            <Link className="text-link" href="/admin/events">All events</Link>
          </div>
        </section>
      </div>
    </>
  );
}
