import { SiteSettings } from "@/lib/community-models";
import { splitUpdate, teamSettingsInput } from "@/lib/admin";
import { adminWrite } from "@/lib/admin-route";

export const runtime = "nodejs";
// Saves the Team page's group photo and caption. Empty fields are removed, which hides the photo.
export async function POST(req: Request) {
  return adminWrite(req, async (data) => {
    await SiteSettings.updateOne({ _id: "team" }, splitUpdate(teamSettingsInput(data)), { upsert: true, runValidators: true });
    return {};
  });
}
