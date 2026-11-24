import { requireAdminPage } from "@/lib/admin";
import { User } from "@/lib/models";
import { AdminHeading } from "@/components/admin/admin-heading";
import { AdminForm } from "@/components/admin/admin-form";

export const metadata = { title: "Members" };
const joined = (date?: Date) =>
  date ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—";
const escape =(text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export default async function Members({ searchParams }: PageProps<"/admin/members">) {
  const session = await requireAdminPage("/admin/members");
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw.trim().slice(0, 100) : "";
  const pattern = q ? new RegExp(escape(q), "i") : null;
  const [admins, members] = await Promise.all([
    User.find({ role: "admin" }).sort({ name: 1 }).select("name email phone").lean(),
    User.find(pattern ? { $or: [{ email: pattern }, { name: pattern }] } : {})
      .sort({ createdAt: -1 }).limit(50).select("name email phone role createdAt").lean(),
  ]);
  return (
    <>
      <AdminHeading title="Members" description="Find members and manage who can open this admin panel." />
      <section className="surface admin-section">
        <h2>Administrators ({admins.length})</h2>
        <ul className="account-list">
          {admins.map((a) => (
            <li key={String(a._id)}>
              <div>
                <span className="item-title">{a.name}{String(a._id) === session.user.id && " (you)"}</span>
                <span className="item-meta">{a.email}</span>
              </div>
              {String(a._id) !== session.user.id && (
                <AdminForm endpoint={`/api/admin/members/${a._id}`} submitLabel="Remove admin" compact
                  confirm={`Remove administrator access for ${a.name}?`} successMessage="Access removed.">
                  <input type="hidden" name="role" value="member" />
                </AdminForm>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="admin-section">
        <form className="admin-filters" method="get">
          <label className="field grow">
            Search members
            <input name="q" defaultValue={q} placeholder="Name or email" />
          </label>
          <button className="button">Search</button>
        </form>
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Member</th><th>Mobile</th><th>Joined</th><th>Role</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={String(m._id)}>
                  <td><span className="item-title">{m.name}</span><span className="item-meta">{m.email}</span></td>
                  <td>{m.phone ?? "—"}</td>
                  <td>{joined((m as { createdAt?: Date }).createdAt)}</td>
                  <td><span className={m.role === "admin" ? "badge" : "badge muted"}>{m.role}</span></td>
                  <td className="row-actions">
                    {m.role !== "admin" && (
                      <AdminForm endpoint={`/api/admin/members/${m._id}`} submitLabel="Make admin" compact
                        confirm={`Give ${m.name} full access to the admin panel?`} successMessage="Now an administrator.">
                        <input type="hidden" name="role" value="admin" />
                      </AdminForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!members.length && <p className="empty-state">No members match “{q}”.</p>}
      </section>
    </>
  );
}
