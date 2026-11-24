import "server-only";
import { isValidObjectId, Types } from "mongoose";
import { ClubEvent, EventRegistration } from "./community-models";
import { InputError } from "./guards";

export type RegistrationFilter = { event?: string; status?: string };
export function registrationQuery({ event, status = "registered" }: RegistrationFilter) {
  if (event && !isValidObjectId(event)) throw new InputError("Unknown event.", 400);
  if (!["registered", "cancelled", "all"].includes(status)) throw new InputError("Unknown status.", 400);
  return {
    ...(event ? { event: new Types.ObjectId(event) } : {}),
    ...(status === "all" ? {} : { status: status as "registered" | "cancelled" }),
  };
}
// Rows shared by the admin table and the CSV so both show the same records.
export async function registrationRows(filter: RegistrationFilter, limit?: number) {
  let query = EventRegistration.find(registrationQuery(filter))
    .sort({ event: 1, registeredAt: 1 })
    .select("event name email phone details registeredAt cancelledAt status");
  if (limit) query = query.limit(limit);
  const rows = await query.lean();
  const events = await ClubEvent.find({ _id: { $in: [...new Set(rows.map((r) => String(r.event)))] } }).select("name").lean();
  const names = new Map(events.map((e) => [String(e._id), e.name]));
  return rows.map((r) => ({
    id: String(r._id),
    event: names.get(String(r.event)) ?? "",
    name: r.name,
    email: r.email,
    phone: r.phone,
    college: r.details?.college ?? "",
    year: r.details?.year ?? "",
    teamName: r.details?.teamName ?? "",
    teammates: ((r.details?.teammates ?? []) as { name: string; email: string }[]),
    registeredAt: r.registeredAt,
    status: r.status,
  }));
}
// Spreadsheet apps evaluate cells starting with these characters as formulas.
function cell(value: unknown) {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function toCsv(rows: Awaited<ReturnType<typeof registrationRows>>) {
  const header = ["Name", "Email", "Phone", "Event", "College", "Year", "Team", "Teammates", "Registered at", "Status"];
  const lines = [header, ...rows.map((r) => [
    r.name, r.email, r.phone, r.event, r.college, r.year, r.teamName,
    r.teammates.map((m) => `${m.name} <${m.email}>`).join("; "), r.registeredAt, r.status,
  ])];
  return "\uFEFF" + lines.map((line) => line.map(cell).join(",")).join("\r\n") + "\r\n";
}
