import "server-only";
import { database } from "./db";
import { Project, TeamMember } from "./community-models";

// Public reads for the team and projects pages. Without a database they render empty states.
export async function publishedTeam() {
  if (!process.env.MONGODB_URI) return [];
  await database();
  return TeamMember.find({ published: true }).sort({ order: 1, createdAt: 1 }).select("name role bio image tenure").lean();
}
export async function publishedProjects() {
  if (!process.env.MONGODB_URI) return [];
  await database();
  return Project.find({ published: true }).sort({ order: 1, createdAt: 1 }).select("slug title category description image").lean();
}
export async function publishedProject(slug: string) {
  if (!process.env.MONGODB_URI) return null;
  await database();
  return Project.findOne({ slug, published: true }).lean();
}
