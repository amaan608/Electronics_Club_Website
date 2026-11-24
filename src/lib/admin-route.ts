import "server-only";
import { isValidObjectId } from "mongoose";
import { failure, InputError, requestBody } from "./guards";
import { isDuplicate, requireAdminApi } from "./admin";

type Admin = Awaited<ReturnType<typeof requireAdminApi>>;
// Wraps an admin JSON endpoint: same-origin check, administrator check, generic errors.
export async function adminWrite(
  req: Request,
  run: (data: Record<string, unknown>, admin: Admin) => Promise<Record<string, unknown>>,
  status = 200,
) {
  try {
    const admin = await requireAdminApi();
    const data = await requestBody(req);
    const result = await run(data, admin);
    return Response.json({ ok: true, ...result }, { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isDuplicate(error)) return failure(new InputError("Another record already uses this URL slug.", 409));
    return failure(error);
  }
}
export function recordId(id: string) {
  if (!isValidObjectId(id)) throw new InputError("This record could not be found.", 404);
  return id;
}
export function found<T>(record: T | null): T {
  if (!record) throw new InputError("This record could not be found.", 404);
  return record;
}
