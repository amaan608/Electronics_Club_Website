import { redirect } from "next/navigation";
import Link from "next/link";
import { currentSession } from "@/lib/member-access";
import { SignOut } from "@/components/sign-out";
import { CornerMarks } from "@/components/mark";
import { MemberForm } from "@/components/member-form";
import { registrationsOf } from "@/lib/events";
import { ClubEvent, MemberQuery } from "@/lib/community-models";
import { eventDate } from "@/lib/format";
export const metadata = { title: "Member account", robots: { index: false } };

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "EC";
}
const since = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function Account() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { user } = session;
  if (!user.phone) redirect("/complete-profile");
  const isAdmin = user.role === "admin";
  const [registrations, queries, events] = await Promise.all([
    registrationsOf(user.id),
    MemberQuery.find({ userId: user.id }).sort({ createdAt: -1 }).select("subject reply createdAt").lean(),
    isAdmin ? ClubEvent.find().sort({ startsAt: -1, createdAt: -1 }).select("name slug registeredCount capacity registrationStatus").lean() : [],
  ]);
  const answered = queries.filter((q) => q.reply).length;
  return (
    <div className="wrap inner-page account-page">
      <header className="account-hero">
        <CornerMarks />
        <div className="avatar" aria-hidden="true">{initials(user.name)}</div>
        <div className="account-identity">
          <p className="sup">
            <span className="square" />
            {isAdmin ? "CLUB ADMINISTRATOR" : "CLUB MEMBER"}
          </p>
          <h1 className="display account-name">{user.name}</h1>
          <p className="account-meta">
            <span>{user.email}</span>
            <span>Member since {since(user.createdAt)}</span>
          </p>
        </div>
        <div className="account-actions">
          <Link className="button primary" href="/events">Browse events</Link>
          <SignOut />
        </div>
      </header>

      <dl className="account-stats">
        <div><dt>Event registrations</dt><dd>{registrations.length}</dd></div>
        <div><dt>Queries sent</dt><dd>{queries.length}</dd></div>
        <div><dt>Replies received</dt><dd>{answered}</dd></div>
      </dl>

      <div className="account-grid">
        <section className="surface account-card" id="profile" aria-labelledby="profile-title">
          <p className="sup"><span className="slash">//</span> PROFILE</p>
          <h2 id="profile-title">Your details</h2>
          <dl className="mini-sheet">
            <div><dt>Full name</dt><dd>{user.name}</dd></div>
            <div><dt>Email</dt><dd>{user.email}{user.emailVerified && <span className="badge">Verified</span>}</dd></div>
            <div><dt>Mobile</dt><dd>{user.phone}</dd></div>
          </dl>
          <details className="edit-profile">
            <summary>Edit details</summary>
            <p className="form-hint">Changes apply to new registrations and queries. Your email can’t be changed here.</p>
            <MemberForm mode="profile" editing name={user.name} phone={user.phone} next="/account" />
          </details>
        </section>

        <section className="surface account-card" aria-labelledby="registrations-title">
          <p className="sup"><span className="slash">//</span> EVENTS</p>
          <h2 id="registrations-title">My registrations</h2>
          {registrations.length ? (
            <ul className="account-list">
              {registrations.map((r) => (
                <li key={r.id}>
                  <div>
                    <Link className="item-title" href={`/events/${r.event.slug}`}>{r.event.name}</Link>
                    <span className="item-meta">
                      {eventDate(r.event.startsAt)}
                      {r.teamName && <> · Team {r.teamName}</>}
                    </span>
                  </div>
                  <Link className="text-link" href={`/events/${r.event.slug}/register`}>
                    {r.event.registrationStatus === "open" ? "Manage" : "View"}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <p>You haven’t registered for any events yet.</p>
              <Link className="button" href="/events/embedded-101/register">Register for Embedded 101</Link>
            </div>
          )}
        </section>

        <section className="surface account-card" aria-labelledby="queries-title">
          <p className="sup"><span className="slash">//</span> QUERIES</p>
          <h2 id="queries-title">Recent queries</h2>
          {queries.length ? (
            <ul className="account-list">
              {queries.slice(0, 4).map((q) => (
                <li key={String(q._id)}>
                  <div>
                    <span className="item-title">{q.subject}</span>
                    <span className="item-meta">{q.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}</span>
                  </div>
                  <span className={q.reply ? "badge" : "badge muted"}>{q.reply ? "Answered" : "Awaiting reply"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Questions you send to the club appear here.</p>
          )}
          <Link className="text-link" href="/queries">{queries.length ? "All queries" : "Ask the club"}</Link>
        </section>

        {isAdmin && (
          <section className="surface account-card admin-card" aria-labelledby="admin-title">
            <p className="sup"><span className="slash">//</span> ADMINISTRATION</p>
            <h2 id="admin-title">Club desk</h2>
            <p>Manage events, registrations, announcements, member queries and administrators.</p>
            <ul className="account-list">
              <li>
                <span className="item-title">All events</span>
                <a className="text-link" href="/admin/export/registrations.csv">Download CSV</a>
              </li>
              {events.map((e) => (
                <li key={String(e._id)}>
                  <div>
                    <span className="item-title">{e.name}</span>
                    <span className="item-meta">
                      {e.registeredCount ?? 0}{e.capacity ? ` / ${e.capacity}` : ""} registered · {e.registrationStatus}
                    </span>
                  </div>
                  <a className="text-link" href={`/admin/export/registrations.csv?event=${e._id}`}>Download CSV</a>
                </li>
              ))}
            </ul>
            <Link className="button primary" href="/admin">Open admin panel</Link>
          </section>
        )}
      </div>
    </div>
  );
}
