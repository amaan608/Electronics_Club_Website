import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireAdminPage } from "@/lib/admin";
import { ClubEvent } from "@/lib/community-models";
import { AdminHeading } from "@/components/admin/admin-heading";
import { AdminForm } from "@/components/admin/admin-form";
import { EventFields } from "@/components/admin/event-fields";
import { RegistrationTable } from "@/components/admin/registration-table";
import { registrationRows } from "@/lib/registration-export";

export const metadata = { title: "Edit event" };
export default async function EditEvent({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  await requireAdminPage(`/admin/events/${id}`);
  if (!isValidObjectId(id)) notFound();
  const event = await ClubEvent.findById(id).lean();
  if (!event) notFound();
  const rows = await registrationRows({ event: id }, 500);
  return (
    <>
      <div className="crumb"><Link href="/admin/events">Events</Link><span>/</span>{event.name}</div>
      <AdminHeading
        title={event.name}
        description={`${event.registeredCount ?? 0}${event.capacity ? ` of ${event.capacity}` : ""} seats taken.`}
        actions={<>
          {event.published && <Link className="button" href={`/events/${event.slug}`}>View on site</Link>}
          <a className="button" href={`/admin/export/registrations.csv?event=${id}`}>Download CSV</a>
        </>}
      />
      <section className="surface admin-section">
        <AdminForm endpoint={`/api/admin/events/${id}`} submitLabel="Save event" successMessage="Event saved.">
          <EventFields event={event} />
        </AdminForm>
      </section>
      <section className="admin-section">
        <h2 className="block-title">Registrations ({rows.length})</h2>
        <RegistrationTable rows={rows} showEvent={false} />
      </section>
    </>
  );
}
