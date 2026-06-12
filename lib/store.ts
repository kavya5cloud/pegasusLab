import { promises as fs } from "fs";
import path from "path";
import type { Project } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");

async function readAll(): Promise<Project[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const projects = JSON.parse(raw) as Project[];
    // Migrate any pre-whiteboard records.
    return projects.map((p) => ({ ...p, items: p.items ?? [] }));
  } catch {
    return [];
  }
}

async function writeAll(projects: Project[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), "utf8");
}

export async function listProjects(): Promise<Project[]> {
  const projects = await readAll();
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await readAll();
  return projects.find((p) => p.id === id) ?? null;
}

export async function createProject(
  input: Pick<Project, "name" | "description"> & Partial<Pick<Project, "items">>
): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID().slice(0, 8),
    name: input.name,
    description: input.description,
    items: input.items ?? [],
    blueprint: null,
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
  patch: Partial<Project>
): Promise<Project | null> {
  const projects = await readAll();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  projects[idx] = { ...projects[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await writeAll(projects);
  return projects[idx];
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await readAll();
  const next = projects.filter((p) => p.id !== id);
  if (next.length === projects.length) return false;
  await writeAll(next);
  return true;
}
