import { User } from "@/lib/models";
import { InputError } from "@/lib/guards";
import { adminWrite, found, recordId } from "@/lib/admin-route";

export const runtime = "nodejs";
export async function POST(req: Request, ctx: RouteContext<"/api/admin/members/[id]">) {
  return adminWrite(req, async (data, admin) => {
    const id = recordId((await ctx.params).id);
    const role = data.role;
    if (role !== "admin" && role !== "member") throw new InputError("Choose a role.");
    if (id === admin.user.id && role !== "admin") throw new InputError("You can’t remove your own administrator access.", 409);
    found(await User.findByIdAndUpdate(id, { $set: { role } }));
    return {};
  });
}
