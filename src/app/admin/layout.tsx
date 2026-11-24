import { requireAdminPage } from "@/lib/admin";
import { MemberQuery } from "@/lib/community-models";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata = {
  title: { default: "Admin", template: "%s · Admin · Electronics Club" },
  robots: { index: false, follow: false },
};
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdminPage();
  const openQueries = await MemberQuery.countDocuments({ reply: { $exists: false } });
  return (
    <div className="wrap admin-shell">
      <aside className="admin-side">
        <p className="sup"><span className="square" />CLUB DESK</p>
        <p className="admin-who">{session.user.name}</p>
        <AdminNav openQueries={openQueries} />
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
