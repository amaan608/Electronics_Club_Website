import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { Project } from "@/lib/community-models";
import { AdminHeading } from "@/components/admin/admin-heading";
import { AdminForm } from "@/components/admin/admin-form";
import { ClubImage } from "@/components/club-image";
import { ImageHint } from "@/components/admin/image-hint";

export const metadata = { title: "Projects" };
type Values = {
  slug?: string; title?: string; category?: string | null; description?: string; detail?: string | null;
  hardware?: string | null; stage?: string | null; image?: string | null; order?: number | null; published?: boolean | null;
};
function Fields({ project = {} }: { project?: Values }) {
  return (
    <>
      <div className="form-row">
        <label className="field">Title<input name="title" required maxLength={120} defaultValue={project.title ?? ""} /></label>
        <label className="field">
          URL slug
          <input name="slug" required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={project.slug ?? ""} placeholder="line-follower" />
        </label>
        <label className="field">Category<input name="category" maxLength={60} defaultValue={project.category ?? ""} placeholder="ROBOTICS" /></label>
        <label className="field">Stage<input name="stage" maxLength={60} defaultValue={project.stage ?? ""} placeholder="Prototype" /></label>
      </div>
      <label className="field">Short description<textarea name="description" required maxLength={300} rows={2} defaultValue={project.description ?? ""} /></label>
      <label className="field">Build notes<textarea name="detail" maxLength={5000} rows={4} defaultValue={project.detail ?? ""} /></label>
      <label className="field">Hardware<input name="hardware" maxLength={300} defaultValue={project.hardware ?? ""} placeholder="ESP32, IR sensors, motor driver" /></label>
      <label className="field">
        Image URL (Cloudinary)
        <input name="image" maxLength={500} defaultValue={project.image ?? ""} placeholder="https://res.cloudinary.com/your-cloud/image/upload/v1/projects/name.jpg" />
      </label>
      <ImageHint />
      <div className="form-row">
        <label className="field">Display order<input name="order" type="number" min={0} max={999} defaultValue={project.order ?? 0} /></label>
        <label className="check align-end"><input type="checkbox" name="published" defaultChecked={project.published ?? true} /> Show on the Projects page</label>
      </div>
    </>
  );
}
export default async function ProjectsAdmin() {
  await requireAdminPage("/admin/projects");
  const projects = await Project.find().sort({ order: 1, createdAt: 1 }).lean();
  return (
    <>
      <AdminHeading title="Projects" description="Projects appear on the Projects page in display order, lowest first." />
      <section className="surface admin-section">
        <h2>Add a project</h2>
        <AdminForm endpoint="/api/admin/projects" submitLabel="Add project" successMessage="Project added." reset>
          <Fields project={{ order: projects.length }} />
        </AdminForm>
      </section>
      <section className="admin-section">
        <h2 className="block-title">Projects ({projects.length})</h2>
        {!projects.length && <p className="empty-state">No projects yet.</p>}
        <div className="admin-stack">
          {projects.map((p) => (
            <details className="surface admin-item" key={String(p._id)}>
              <summary>
                <span className="thumb">{p.image ? <ClubImage src={p.image} alt="" width={66} height={44} /> : "—"}</span>
                <span className="item-title">{p.title}<span className="item-meta"> · /projects/{p.slug}</span></span>
                <span className={p.published ? "badge" : "badge muted"}>{p.published ? "Shown" : "Hidden"}</span>
              </summary>
              <AdminForm endpoint={`/api/admin/projects/${p._id}`} submitLabel="Save changes">
                <Fields project={p} />
              </AdminForm>
              <div className="card-actions">
                {p.published && <Link className="text-link" href={`/projects/${p.slug}`}>View on site</Link>}
                <AdminForm endpoint={`/api/admin/projects/${p._id}`} submitLabel="Delete project" compact className="danger"
                  confirm={`Delete “${p.title}”? This can’t be undone.`} successMessage="Deleted.">
                  <input type="hidden" name="intent" value="delete" />
                </AdminForm>
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
