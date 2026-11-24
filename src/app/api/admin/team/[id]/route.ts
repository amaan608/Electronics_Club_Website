import { TeamMember } from "@/lib/community-models";
import { splitUpdate, teamInput } from "@/lib/admin";
import { adminWrite, found, recordId } from "@/lib/admin-route";

export const runtime = "nodejs";
// { intent: "delete" } removes the member; anything else saves the submitted fields.
export async function POST(req: Request, ctx: RouteContext<"/api/admin/team/[id]">) {
  return adminWrite(req, async (data) => {
    const id = recordId((await ctx.params).id);
    if (data.intent === "delete") {
      found(await TeamMember.findByIdAndDelete(id));
      return { deleted: true };
    }
    found(await TeamMember.findByIdAndUpdate(id, splitUpdate(teamInput(data)), { runValidators: true }));
    return {};
  });
}
