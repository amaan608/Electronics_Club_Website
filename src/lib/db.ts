import "server-only";
import mongoose from "mongoose";
import { setting } from "./config";
import { User, Account, Challenge, RateBucket, GoogleEnrollment } from "./models";
import { Announcement, MemberQuery, ClubEvent, EventRegistration, TeamMember, Project } from "./community-models";
import { brochureProjects, demoProjectSlugs, team2026 } from "./seed-data";

// Runs a seed once per database. The marker insert is atomic, so concurrent servers cannot both seed.
async function seedOnce(db: NonNullable<typeof mongoose.connection.db>, id: string, insert: () => Promise<unknown>) {
  try {
    await db.collection<{ _id: string }>("seed_markers").insertOne({ _id: id });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return;
    throw error;
  }
  try {
    await insert();
  } catch (error) {
    await db.collection<{ _id: string }>("seed_markers").deleteOne({ _id: id });
    throw error;
  }
}

async function connect() {
  await mongoose.connect(setting("MONGODB_URI"), {
    maxPoolSize: 8,
    serverSelectionTimeoutMS: 8000,
    autoIndex: false,
    autoCreate: false,
  });
  // Await uniqueness before the first OAuth callback or concurrent OTP request.
  await Promise.all(
    [User, Account, Challenge, RateBucket, GoogleEnrollment, Announcement, MemberQuery, ClubEvent, EventRegistration, TeamMember, Project].map((m) => m.createIndexes()),
  );
  const db = mongoose.connection.db!;
  await Promise.all([
    db.collection("session").createIndex({ token: 1 }, { unique: true }),
    db
      .collection("session")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db
      .collection("verification")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  // Embedded 101 is the club's flagship event; create it once so its form works without admin setup.
  // Later edits in the admin panel are kept because only missing documents are inserted.
  await ClubEvent.updateOne(
    { slug: "embedded-101" },
    { $setOnInsert: {
      name: "Embedded 101", teamSize: 3, registrationStatus: "open", published: true, registeredCount: 0,
      summary: "A free online course and competition introducing embedded hardware through simulation, teamwork, and a final build.",
      venue: "Online",
    } },
    { upsert: true },
  );
  // Team and projects start from the seed data; deleting entries later does not bring them back.
  await Promise.all([
    seedOnce(db, "team-2026-27", () => TeamMember.insertMany(team2026)),
    // Replaces the old demo projects with the club's real ones. Projects added in the admin panel are kept,
    // and a slug that already exists is left as it is.
    seedOnce(db, "brochure-projects-2026", async () => {
      await Project.deleteMany({ slug: { $in: demoProjectSlugs } });
      await Project.bulkWrite(
        brochureProjects.map((project) => ({
          updateOne: { filter: { slug: project.slug }, update: { $setOnInsert: project }, upsert: true },
        })),
      );
    }),
  ]);
  return mongoose.connection;
}
const cache = globalThis as typeof globalThis & {
  electronicsDatabase?: ReturnType<typeof connect>;
};
export function database() {
  return (cache.electronicsDatabase ??= connect().catch((error) => {
    delete cache.electronicsDatabase;
    throw error;
  }));
}
