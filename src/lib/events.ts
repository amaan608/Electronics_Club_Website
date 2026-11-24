import "server-only";
import { Types } from "mongoose";
import { database } from "./db";
import { ClubEvent, EventRegistration } from "./community-models";
import { emailAddress, InputError } from "./guards";

export type Member = { id: string; name: string; email: string; phone?: string | null };
export const studyYears = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgraduate", "Other"] as const;
export type RegistrationDetails = {
  college: string;
  year: string;
  teamName?: string;
  teammates?: { name: string; email: string }[];
};
const listed = "slug name summary description startsAt venue capacity teamSize registeredCount registrationStatus";

export async function publishedEvents() {
  if (!process.env.MONGODB_URI) return [];
  await database();
  return ClubEvent.find({ published: true }).sort({ startsAt: 1, createdAt: -1 }).select(listed).lean();
}
export async function publishedEvent(slug: string) {
  if (!process.env.MONGODB_URI) return null;
  await database();
  return ClubEvent.findOne({ slug, published: true }).select(listed).lean();
}
export async function registrationOf(eventId: Types.ObjectId, userId: string) {
  return EventRegistration.findOne({ event: eventId, user: userId }).select("status registeredAt details").lean();
}
export async function registrationsOf(userId: string) {
  await database();
  const rows = await EventRegistration.find({ user: userId, status: "registered" })
    .sort({ registeredAt: -1 }).select("event registeredAt details").lean();
  const events = await ClubEvent.find({ _id: { $in: rows.map((r) => r.event) }, published: true })
    .select("slug name startsAt venue registrationStatus").lean();
  const byId = new Map(events.map((e) => [String(e._id), e]));
  return rows.flatMap((r) => {
    const event = byId.get(String(r.event));
    return event ? [{ id: String(r._id), registeredAt: r.registeredAt, teamName: r.details?.teamName, event }] : [];
  });
}

function text(value: unknown, label: string, max: number) {
  const result = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!result || result.length > max) throw new InputError(`Enter ${label} (up to ${max} characters).`);
  return result;
}
// Validates the form for an event. Teams need a name and every teammate's name and email.
export function registrationDetails(data: Record<string, unknown>, teamSize: number, ownEmail: string): RegistrationDetails {
  const college = text(data.college, "your college or institute", 160);
  const year = typeof data.year === "string" && (studyYears as readonly string[]).includes(data.year) ? data.year : "";
  if (!year) throw new InputError("Choose your year of study.");
  if (teamSize <= 1) return { college, year };
  const teamName = text(data.teamName, "a team name", 80);
  const list = Array.isArray(data.teammates) ? data.teammates : [];
  if (list.length !== teamSize - 1) throw new InputError(`Add ${teamSize - 1} teammates.`);
  const seen = new Set([ownEmail.toLowerCase()]);
  const teammates = list.map((mate, i) => {
    const entry = mate && typeof mate === "object" ? (mate as Record<string, unknown>) : {};
    const name = text(entry.name, `teammate ${i + 1}'s name`, 120);
    let email: string;
    try { email = emailAddress(entry.email); } catch { throw new InputError(`Enter a valid email for teammate ${i + 1}.`); }
    if (seen.has(email)) throw new InputError("Each team member needs a different email address.");
    seen.add(email);
    return { name, email };
  });
  return { college, year, teamName, teammates };
}

export async function changeRegistration(
  slug: string,
  member: Member,
  intent: "register" | "cancel",
  data: Record<string, unknown> = {},
) {
  if (!member.phone) throw new InputError("Complete your member profile before registering.", 403);
  const conn = await database();
  return conn.transaction(async (session) => {
    const event = await ClubEvent.findOne({ slug, published: true }).session(session);
    if (!event) throw new InputError("This event could not be found.", 404);
    if (event.registrationStatus !== "open")
      throw new InputError(intent === "register" ? "Registration is not open for this event." : "Registration for this event has closed. Contact the club to change it.", 409);
    const current = await EventRegistration.findOne({ event: event._id, user: member.id }).session(session);
    if (intent === "cancel") {
      if (current?.status !== "registered") return "cancelled" as const;
      await EventRegistration.updateOne({ _id: current._id }, { $set: { status: "cancelled", cancelledAt: new Date() } }, { session });
      await ClubEvent.updateOne({ _id: event._id, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } }, { session });
      return "cancelled" as const;
    }
    const details = registrationDetails(data, event.teamSize ?? 1, member.email);
    const snapshot = { name: member.name, email: member.email, phone: member.phone, details };
    if (current?.status === "registered") {
      // Already holding a seat: only the submitted details change.
      await EventRegistration.updateOne({ _id: current._id }, { $set: snapshot }, { session, runValidators: true });
      return "updated" as const;
    }
    // The conditional increment holds the seat; concurrent claims conflict on this document.
    const seat = await ClubEvent.updateOne(
      { _id: event._id, ...(event.capacity ? { registeredCount: { $lt: event.capacity } } : {}) },
      { $inc: { registeredCount: 1 } },
      { session },
    );
    if (!seat.modifiedCount) throw new InputError("This event is full.", 409);
    await EventRegistration.updateOne(
      { event: event._id, user: member.id },
      { $set: { ...snapshot, status: "registered", registeredAt: new Date() }, $unset: { cancelledAt: 1 } },
      { upsert: true, session, runValidators: true },
    );
    return "registered" as const;
  });
}
