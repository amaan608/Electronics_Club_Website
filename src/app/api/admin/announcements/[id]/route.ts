import { Announcement } from "@/lib/community-models";
import { announcementInput } from "@/lib/admin";
import { adminWrite, found, recordId } from "@/lib/admin-route";

export const runtime = "nodejs";
export async function POST(req: Request, ctx: RouteContext<"/api/admin/announcements/[id]">) {
  return adminWrite(req, async (data) => {
    const id = recordId((await ctx.params).id);
    found(await Announcement.findByIdAndUpdate(id, { $set: announcementInput(data) }, { runValidators: true }));
    return {};
  });
}
