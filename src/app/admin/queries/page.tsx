import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { MemberQuery } from "@/lib/community-models";
import { AdminHeading } from "@/components/admin/admin-heading";
import { AdminForm } from "@/components/admin/admin-form";

export const metadata = { title: "Queries" };
const views = { open: "Awaiting reply", answered: "Answered", all: "All" } as const;
export default async function Queries({ searchParams }: PageProps<"/admin/queries">) {
  await requireAdminPage();
  const raw = (await searchParams).show;
  const show = typeof raw === "string" && raw in views ? (raw as keyof typeof views) : "open";
  const filter = show === "open" ? { reply: { $exists: false } } : show === "answered" ? { reply: { $exists: true } } : {};
  const queries = await MemberQuery.find(filter).sort({ createdAt: show === "open" ? 1 : -1 }).limit(200).lean();
  return (
    <>
      <AdminHeading title="Member queries" description="Questions from signed-in members. Replies appear on the member's Queries page." />
      <nav className="admin-tabs" aria-label="Filter queries">
        {Object.entries(views).map(([key, label]) => (
          <Link key={key} href={`/admin/queries?show=${key}`} aria-current={show === key ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {!queries.length && <p className="empty-state">{show === "open" ? "Every query has a reply." : "No queries here yet."}</p>}
      <div className="admin-stack">
        {queries.map((q) => (
          <article className="surface admin-item query-admin" id={`q-${q._id}`} key={String(q._id)}>
            <header>
              <div>
                <h2>{q.subject}</h2>
                <p className="item-meta">
                  {q.name} · <a href={`mailto:${q.email}`}>{q.email}</a> · <a href={`tel:${q.phone}`}>{q.phone}</a> ·{" "}
                  {q.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                </p>
              </div>
              <span className={q.reply ? "badge" : "badge muted"}>{q.reply ? "Answered" : "Awaiting reply"}</span>
            </header>
            <p className="query-text">{q.message}</p>
            <AdminForm
              endpoint={`/api/admin/queries/${q._id}`}
              submitLabel={q.reply ? "Update reply" : "Send reply"}
              successMessage="Reply saved. The member can read it on their Queries page."
            >
              <label className="field">Reply<textarea name="reply" required maxLength={4000} rows={3} defaultValue={q.reply ?? ""} /></label>
            </AdminForm>
          </article>
        ))}
      </div>
    </>
  );
}
