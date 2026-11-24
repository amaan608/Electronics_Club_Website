import { ClubEvent } from "@/lib/community-models";
import { eventInput } from "@/lib/admin";
import { adminWrite, found, recordId } from "@/lib/admin-route";

export const runtime = "nodejs";
// The seat counter is never written here; registrations maintain it.
export async function POST(req: Request, ctx: RouteContext<"/api/admin/events/[id]">) {
  return adminWrite(req, async (data) => {
    const id = recordId((await ctx.params).id);
    const input = eventInput(data);
    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined || value === "") unset[key] = 1;
      else set[key] = value;
    }
    found(await ClubEvent.findByIdAndUpdate(id, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { runValidators: true }));
    return {};
  });
}
