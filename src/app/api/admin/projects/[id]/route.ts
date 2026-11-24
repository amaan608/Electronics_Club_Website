import { Project } from "@/lib/community-models";
import { projectInput, splitUpdate } from "@/lib/admin";
import { adminWrite, found, recordId } from "@/lib/admin-route";

export const runtime = "nodejs";
// { intent: "delete" } removes the project; anything else saves the submitted fields.
export async function POST(req: Request, ctx: RouteContext<"/api/admin/projects/[id]">) {
  return adminWrite(req, async (data) => {
    const id = recordId((await ctx.params).id);
    if (data.intent === "delete") {
      found(await Project.findByIdAndDelete(id));
      return { deleted: true };
    }
    found(await Project.findByIdAndUpdate(id, splitUpdate(projectInput(data)), { runValidators: true }));
    return {};
  });
}
