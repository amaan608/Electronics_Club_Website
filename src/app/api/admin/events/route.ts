import { ClubEvent } from "@/lib/community-models";
import { eventInput } from "@/lib/admin";
import { adminWrite } from "@/lib/admin-route";

export const runtime = "nodejs";
export async function POST(req: Request) {
  return adminWrite(req, async (data) => {
    const input = eventInput(data);
    const fields = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== ""));
    const created = await ClubEvent.create({ ...fields, registeredCount: 0 });
    return { id: String(created._id) };
  }, 201);
}
