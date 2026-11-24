import { requireAdminPage } from "@/lib/admin";
import { Announcement } from "@/lib/community-models";
import { AdminHeading } from "@/components/admin/admin-heading";
import { AdminForm } from "@/components/admin/admin-form";

export const metadata = { title: "Announcements" };
function Fields({ title = "", message = "", published = false }: { title?: string; message?: string; published?: boolean }) {
  return (
    <>
      <label className="field">Title<input name="title" required maxLength={120} defaultValue={title} /></label>
      <label className="field">Message<textarea name="message" required maxLength={3000} rows={4} defaultValue={message} /></label>
      <label className="check"><input type="checkbox" name="published" defaultChecked={published} /> Show on the home page</label>
    </>
  );
}
export default async function Announcements() {
  await requireAdminPage();
  const items = await Announcement.find().sort({ createdAt: -1 }).lean();
  return (
    <>
      <AdminHeading title="Announcements" description="Published announcements appear on the home page notice board, newest first." />
      <section className="surface admin-section">
        <h2>New announcement</h2>
        <AdminForm endpoint="/api/admin/announcements" submitLabel="Create announcement" successMessage="Announcement created." reset>
          <Fields />
        </AdminForm>
      </section>
      <section className="admin-section">
        <h2 className="block-title">All announcements</h2>
        {!items.length && <p className="empty-state">No announcements yet.</p>}
        <div className="admin-stack">
          {items.map((a) => (
            <details className="surface admin-item" key={String(a._id)}>
              <summary>
                <span className="item-title">{a.title}</span>
                <span className="item-meta">
                  {a.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                </span>
                <span className={a.published ? "badge" : "badge muted"}>{a.published ? "Published" : "Draft"}</span>
              </summary>
              <AdminForm endpoint={`/api/admin/announcements/${a._id}`} submitLabel="Save changes">
                <Fields title={a.title} message={a.message} published={!!a.published} />
              </AdminForm>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
