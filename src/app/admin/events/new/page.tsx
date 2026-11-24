import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { AdminHeading } from "@/components/admin/admin-heading";
import { AdminForm } from "@/components/admin/admin-form";
import { EventFields } from "@/components/admin/event-fields";

export const metadata = { title: "New event" };
export default async function NewEvent() {
  await requireAdminPage("/admin/events/new");
  return (
    <>
      <div className="crumb"><Link href="/admin/events">Events</Link><span>/</span>New event</div>
      <AdminHeading title="New event" description="Save it as a draft first, then publish it when the details are final." />
      <section className="surface admin-section">
        <AdminForm endpoint="/api/admin/events" submitLabel="Create event" redirectTo="/admin/events/:id">
          <EventFields />
        </AdminForm>
      </section>
    </>
  );
}
