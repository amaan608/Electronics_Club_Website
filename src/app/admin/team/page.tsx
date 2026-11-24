import { requireAdminPage } from "@/lib/admin";
import { SiteSettings, TeamMember } from "@/lib/community-models";
import { AdminHeading } from "@/components/admin/admin-heading";
import { AdminForm } from "@/components/admin/admin-form";
import { ClubImage, initials } from "@/components/club-image";
import { ImageHint } from "@/components/admin/image-hint";

export const metadata = { title: "Team" };
type Values = { name?: string; role?: string; bio?: string | null; tenure?: string | null; image?: string | null; order?: number | null; published?: boolean | null };

function Fields({ member = {} }: { member?: Values }) {
  return (
    <>
      <div className="form-row">
        <label className="field">Name<input name="name" required maxLength={80} defaultValue={member.name ?? ""} /></label>
        <label className="field">Role<input name="role" required maxLength={80} defaultValue={member.role ?? ""} placeholder="Design Head" /></label>
      </div>
      <label className="field">Short bio<textarea name="bio" maxLength={300} rows={2} defaultValue={member.bio ?? ""} /></label>
      <label className="field">
        Photo URL (Cloudinary)
        <input name="image" type="url" maxLength={500} defaultValue={member.image ?? ""} placeholder="https://res.cloudinary.com/your-cloud/image/upload/v1/team/name.jpg" />
      </label>
      <ImageHint />
      <div className="form-row">
        <label className="field">Tenure<input name="tenure" maxLength={20} defaultValue={member.tenure ?? "2026–27"} /></label>
        <label className="field">Display order<input name="order" type="number" min={0} max={999} defaultValue={member.order ?? 0} /></label>
      </div>
      <label className="check"><input type="checkbox" name="published" defaultChecked={member.published ?? true} /> Show on the Team page</label>
    </>
  );
}
export default async function TeamAdmin() {
  await requireAdminPage("/admin/team");
  const [team, settings] = await Promise.all([
    TeamMember.find().sort({ order: 1, createdAt: 1 }).lean(),
    SiteSettings.findById("team").lean(),
  ]);
  return (
    <>
      <AdminHeading title="Team" description="Members appear on the Team page in display order, lowest first." />
      <section className="surface admin-section">
        <h2>Group photo</h2>
        <p className="form-hint">Shown across the top of the Team page, above the member cards. The whole photo stays in frame.</p>
        {settings?.groupPhoto && (
          <div className="group-preview">
            <ClubImage src={settings.groupPhoto} alt="Current group photo" width={480} height={270} crop="c_limit" />
          </div>
        )}
        <AdminForm endpoint="/api/admin/settings/team" submitLabel="Save group photo" successMessage="Group photo saved.">
          <label className="field">
            Group photo URL (Cloudinary)
            <input name="groupPhoto" maxLength={500} defaultValue={settings?.groupPhoto ?? ""} placeholder="https://res.cloudinary.com/your-cloud/image/upload/v1/team/group.jpg" />
          </label>
          <label className="field">
            Caption
            <input name="groupCaption" maxLength={120} defaultValue={settings?.groupCaption ?? "The Electronics Club heads, 2026–27"} />
          </label>
          <p className="form-hint">Leave the URL empty and save to hide the photo.</p>
        </AdminForm>
      </section>
      <section className="surface admin-section">
        <h2>Add a team member</h2>
        <AdminForm endpoint="/api/admin/team" submitLabel="Add member" successMessage="Member added." reset>
          <Fields member={{ order: team.length }} />
        </AdminForm>
      </section>
      <section className="admin-section">
        <h2 className="block-title">Team members ({team.length})</h2>
        {!team.length && <p className="empty-state">No team members yet.</p>}
        <div className="admin-stack">
          {team.map((m) => (
            <details className="surface admin-item" key={String(m._id)}>
              <summary>
                <span className="thumb round">
                  {m.image ? <ClubImage src={m.image} alt="" width={44} height={44} crop="c_fill,g_face" /> : initials(m.name)}
                </span>
                <span className="item-title">{m.name}<span className="item-meta"> · {m.role}</span></span>
                {!m.image && <span className="badge muted">No photo</span>}
                <span className={m.published ? "badge" : "badge muted"}>{m.published ? "Shown" : "Hidden"}</span>
              </summary>
              <AdminForm endpoint={`/api/admin/team/${m._id}`} submitLabel="Save changes">
                <Fields member={m} />
              </AdminForm>
              <AdminForm endpoint={`/api/admin/team/${m._id}`} submitLabel="Delete member" compact className="danger"
                confirm={`Delete ${m.name} from the team? This can’t be undone.`} successMessage="Deleted.">
                <input type="hidden" name="intent" value="delete" />
              </AdminForm>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
