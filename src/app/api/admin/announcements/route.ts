import { Announcement } from "@/lib/community-models";
import { announcementInput } from "@/lib/admin";
import { adminWrite } from "@/lib/admin-route";

export const runtime = "nodejs";
export async function POST(req: Request) {
  return adminWrite(req, async (data) => {
    const created = await Announcement.create(announcementInput(data));
    return { id: String(created._id) };
  }, 201);
}
