import { requireAdminPage } from "@/lib/admin";
import { ClubEvent } from "@/lib/community-models";
import { AdminHeading } from "@/components/admin/admin-heading";
import { RegistrationTable } from "@/components/admin/registration-table";
import { registrationRows } from "@/lib/registration-export";

export const metadata = { title: "Registrations" };
const LIMIT = 500;
export default async function Registrations({ searchParams }: PageProps<"/admin/registrations">) {
  await requireAdminPage("/admin/registrations");
  const params = await searchParams;
  const events = await ClubEvent.find().sort({ startsAt: -1, createdAt: -1 }).select("name").lean();
  const ids = new Set(events.map((e) => String(e._id)));
  const event = typeof params.event === "string" && ids.has(params.event) ? params.event : "";
  const status = typeof params.status === "string" && ["registered", "cancelled", "all"].includes(params.status) ? params.status : "registered";
  const rows = await registrationRows({ event: event || undefined, status }, LIMIT);
  const csv = `/admin/export/registrations.csv?${new URLSearchParams({ ...(event ? { event } : {}), status })}`;
  return (
    <>
      <AdminHeading
        title="Registrations"
        description="Filter by event and status. The CSV download uses the same filters and includes every matching row."
        actions={<a className="button primary" href={csv}>Download CSV</a>}
      />
      <form className="admin-filters" method="get">
        <label className="field">
          Event
          <select name="event" defaultValue={event}>
            <option value="">All events</option>
            {events.map((e) => <option key={String(e._id)} value={String(e._id)}>{e.name}</option>)}
          </select>
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={status}>
            <option value="registered">Registered</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>
        </label>
        <button className="button">Apply</button>
      </form>
      {rows.length === LIMIT && <p className="form-hint">Showing the first {LIMIT}. Download the CSV for the full list.</p>}
      <RegistrationTable rows={rows} />
    </>
  );
}
