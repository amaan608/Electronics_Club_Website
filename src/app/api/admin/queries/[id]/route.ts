import { MemberQuery } from "@/lib/community-models";
import { replyInput } from "@/lib/admin";
import { adminWrite, found, recordId } from "@/lib/admin-route";

export const runtime = "nodejs";
// Only the reply can change; the member's question and contact details stay as submitted.
export async function POST(req: Request, ctx: RouteContext<"/api/admin/queries/[id]">) {
  return adminWrite(req, async (data) => {
    const id = recordId((await ctx.params).id);
    found(await MemberQuery.findByIdAndUpdate(id, { $set: { reply: replyInput(data), repliedAt: new Date() } }, { runValidators: true }));
    return {};
  });
}
