import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { currentSession } from "./member-access";
import { database } from "./db";
import { InputError } from "./guards";
import { eventSlug, imageUrl } from "./community-models";

type Session = NonNullable<Awaited<ReturnType<typeof currentSession>>>;
function isAdmin(session: Session) {
  const { user } = session;
  return user.role === "admin" && user.emailVerified === true && !!user.phone;
}

// Pages: guests go to sign-in; signed-in non-admins see the ordinary 404 page.
export const requireAdminPage = cache(async (here = "/admin") => {
  const session = await currentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(here)}`);
  if (!isAdmin(session)) notFound();
  await database();
  return session;
});

// Route handlers: every admin write checks the role on the server.
export async function requireAdminApi() {
  const session = await currentSession();
  if (!session) throw new InputError("Sign in as a club administrator.", 401);
  if (!isAdmin(session)) throw new InputError("Administrator access is required.", 403);
  await database();
  return session;
}

// datetime-local inputs carry no zone; the club schedules in India Standard Time.
export function fromIstInput(value: string) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new InputError("Enter a valid date and time.");
  const date = new Date(value + ":00+05:30");
  if (Number.isNaN(date.getTime())) throw new InputError("Enter a valid date and time.");
  return date;
}
export function toIstInput(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 16);
}

function field(data: Record<string, unknown>, name: string, label: string, max: number, required = true) {
  const value = typeof data[name] === "string" ? (data[name] as string).trim() : "";
  if (required && !value) throw new InputError(`Enter ${label}.`);
  if (value.length > max) throw new InputError(`${label[0].toUpperCase() + label.slice(1)} must be ${max} characters or fewer.`);
  return value;
}
const flag = (value: unknown) => value === true || value === "true" || value === "on";

export function announcementInput(data: Record<string, unknown>) {
  return {
    title: field(data, "title", "a title", 120),
    message: field(data, "message", "a message", 3000),
    published: flag(data.published),
  };
}
export function replyInput(data: Record<string, unknown>) {
  return field(data, "reply", "a reply", 4000);
}
export function eventInput(data: Record<string, unknown>) {
  const slug = field(data, "slug", "a URL slug", 80).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new InputError("Use lowercase letters, numbers and single hyphens in the URL slug, for example soldering-workshop.");
  const whole = (name: string, label: string, min: number, max: number) => {
    const raw = typeof data[name] === "string" ? (data[name] as string).trim() : "";
    if (!raw) return undefined;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) throw new InputError(`${label} must be a whole number from ${min} to ${max}.`);
    return n;
  };
  const status = data.registrationStatus;
  if (status !== "planned" && status !== "open" && status !== "closed") throw new InputError("Choose a registration status.");
  return {
    slug,
    name: field(data, "name", "an event name", 120),
    summary: field(data, "summary", "a short summary", 240),
    description: field(data, "description", "a description", 5000, false),
    venue: field(data, "venue", "a venue", 120, false),
    startsAt: fromIstInput(typeof data.startsAt === "string" ? data.startsAt.trim() : ""),
    capacity: whole("capacity", "Capacity", 1, 100000),
    teamSize: whole("teamSize", "Team size", 1, 6) ?? 1,
    registrationStatus: status,
    published: flag(data.published),
  };
}
export function isDuplicate(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && error.code === 11000;
}

// Cloudinary delivery URLs, e.g. https://res.cloudinary.com/<cloud>/image/upload/v1712/team/mourya.jpg
function imageField(data: Record<string, unknown>) {
  const value = typeof data.image === "string" ? data.image.trim() : "";
  if (!value) return "";
  if (value.length > 500 || !imageUrl.test(value))
    throw new InputError("Paste a Cloudinary image URL that starts with https://res.cloudinary.com/ and contains /image/upload/.");
  return value;
}
function orderField(data: Record<string, unknown>) {
  const raw = typeof data.order === "string" ? data.order.trim() : typeof data.order === "number" ? String(data.order) : "";
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new InputError("Display order must be a whole number from 0 to 999.");
  return n;
}
export function teamInput(data: Record<string, unknown>) {
  return {
    name: field(data, "name", "a name", 80),
    role: field(data, "role", "a role", 80),
    bio: field(data, "bio", "a short bio", 300, false),
    tenure: field(data, "tenure", "a tenure", 20, false),
    image: imageField(data),
    order: orderField(data),
    published: flag(data.published),
  };
}
export function projectInput(data: Record<string, unknown>) {
  const slug = field(data, "slug", "a URL slug", 80).toLowerCase();
  if (!eventSlug.test(slug))
    throw new InputError("Use lowercase letters, numbers and single hyphens in the URL slug, for example line-follower.");
  return {
    slug,
    title: field(data, "title", "a title", 120),
    category: field(data, "category", "a category", 60, false),
    description: field(data, "description", "a short description", 300),
    detail: field(data, "detail", "build notes", 5000, false),
    hardware: field(data, "hardware", "the hardware list", 300, false),
    stage: field(data, "stage", "a stage", 60, false),
    image: imageField(data),
    order: orderField(data),
    published: flag(data.published),
  };
}
// Empty optional strings are removed from the document instead of stored.
export function splitUpdate(input: Record<string, unknown>) {
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === "") unset[key] = 1;
    else set[key] = value;
  }
  return { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) };
}
