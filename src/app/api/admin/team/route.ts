import { TeamMember } from "@/lib/community-models";
import { teamInput } from "@/lib/admin";
import { adminWrite } from "@/lib/admin-route";

export const runtime = "nodejs";
export async function POST(req: Request) {
  return adminWrite(req, async (data) => {
    const fields = Object.fromEntries(Object.entries(teamInput(data)).filter(([, v]) => v !== ""));
    const created = await TeamMember.create(fields);
    return { id: String(created._id) };
  }, 201);
}
