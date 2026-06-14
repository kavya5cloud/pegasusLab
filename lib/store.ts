import { promises as fs } from "fs";
import path from "path";
import type { Project } from "./types";
import * as db from "./db";

// Storage facade — uses Neon Postgres when DATABASE_URL is set, otherwise a
// local JSON file. Both paths are scoped by `owner` (the session email, or
// "demo" when unauthenticated) so projects stay private per user.
const USE_DB = !!process.env.DATABASE_URL;

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");

async function readAll(): Promise<Project[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const projects = JSON.parse(raw) as Project[];
    return projects.map((p) => ({ ...p, items: p.items ?? [] }));
  } catch {
    return [];
  }
}

async function writeAll(projects: Project[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), "utf8");
}

// Legacy projects predate per-user ownership; treat them as belonging to the
// "demo" owner so existing local data stays visible without a sign-in.
function ownsRecord(p: Project, owner: string): boolean {
  return (p.owner ?? "demo") === owner;
}

export async function listProjects(owner: string = "demo"): Promise<Project[]> {
  if (USE_DB) return db.listProjects(owner);
  const projects = await readAll();
  return projects
    .filter((p) => ownsRecord(p, owner))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(
  id: string,
  owner: string = "demo"
): Promise<Project | null> {
  if (USE_DB) return db.getProject(id, owner);
  const projects = await readAll();
  const found = projects.find((p) => p.id === id);
  return found && ownsRecord(found, owner) ? found : null;
}

export async function createProject(
  input: Pick<Project, "name" | "description"> & Partial<Pick<Project, "items">>,
  owner: string = "demo"
): Promise<Project> {
  if (USE_DB) return db.createProject(input, owner);
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID().slice(0, 8),
    name: input.name,
    description: input.description,
    items: input.items ?? [],
    blueprint: null,
    owner,
    createdAt: now,
    updatedAt: now,
  };
  const projects = await readAll();
  projects.push(project);
  await writeAll(projects);
  return project;
}

export async function updateProject(
  id: string,
  patch: Partial<Project>,
  owner: string = "demo"
): Promise<Project | null> {
  if (USE_DB) return db.updateProject(id, patch, owner);
  const projects = await readAll();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1 || !ownsRecord(projects[idx], owner)) return null;
  projects[idx] = {
    ...projects[idx],
    ...patch,
    id,
    owner,
    updatedAt: new Date().toISOString(),
  };
  await writeAll(projects);
  return projects[idx];
}

export async function getProjectByShareId(shareId: string): Promise<Project | null> {
  if (USE_DB) return db.getProjectByShareId(shareId);
  const projects = await readAll();
  return projects.find((p) => p.shareId === shareId) ?? null;
}

export async function deleteProject(
  id: string,
  owner: string = "demo"
): Promise<boolean> {
  if (USE_DB) return db.deleteProject(id, owner);
  const projects = await readAll();
  const target = projects.find((p) => p.id === id);
  if (!target || !ownsRecord(target, owner)) return false;
  const next = projects.filter((p) => p.id !== id);
  await writeAll(next);
  return true;
}
