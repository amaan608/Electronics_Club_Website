import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { ClubEvent } from "@/lib/community-models";
import { AdminHeading } from "@/components/admin/admin-heading";
import { eventDate } from "@/lib/format";

export const metadata = { title: "Events" };
export default async function Events() {
  await requireAdminPage();
  const events = await ClubEvent.find().sort({ startsAt: -1, createdAt: -1 }).lean();
  return (
    <>
      <AdminHeading
        title="Events"
        description="Only published events appear on the website. Members can register while registration is open."
        actions={<Link className="button primary" href="/admin/events/new">New event</Link>}
      />
      {!events.length ? (
        <p className="empty-state">No events yet. Create one to open registrations.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Event</th><th>Starts</th><th>Registration</th><th>Seats</th><th>Team</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={String(e._id)}>
                  <td>
                    <Link className="item-title" href={`/admin/events/${e._id}`}>{e.name}</Link>
                    <span className="item-meta">/events/{e.slug}</span>
                  </td>
                  <td>{eventDate(e.startsAt)}</td>
                  <td>
                    <span className={e.published && e.registrationStatus === "open" ? "badge" : "badge muted"}>
                      {e.published ? e.registrationStatus : "draft"}
                    </span>
                  </td>
                  <td>{e.registeredCount ?? 0}{e.capacity ? ` / ${e.capacity}` : ""}</td>
                  <td>{(e.teamSize ?? 1) > 1 ? `${e.teamSize} people` : "Solo"}</td>
                  <td className="row-actions">
                    <Link className="text-link" href={`/admin/events/${e._id}`}>Edit</Link>
                    <Link className="text-link" href={`/admin/registrations?event=${e._id}`}>Registrations</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
