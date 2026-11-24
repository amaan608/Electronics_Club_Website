import { requireAdminApi } from "@/lib/admin";
import { failure } from "@/lib/guards";
import { registrationRows, toCsv } from "@/lib/registration-export";

export const runtime = "nodejs";
// GET /admin/export/registrations.csv?event=<id>&status=registered|cancelled|all
export async function GET(req: Request) {
  try {
    await requireAdminApi();
    const params = new URL(req.url).searchParams;
    const rows = await registrationRows({ event: params.get("event") ?? undefined, status: params.get("status") ?? undefined });
    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="registrations.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
