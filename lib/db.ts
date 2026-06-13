import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Project } from "./types";

// Neon serverless (HTTP) client, created lazily so importing this module never
// throws when DATABASE_URL is unset — lib/store.ts only calls in here when a
// connection string is present, otherwise it uses the JSON file store.
let _sql: NeonQueryFunction<false, false> | null = null;
function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

let ready: Promise<void> | null = null;

/** Lazily ensure the projects table exists (runs once per cold start). */
function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id          TEXT PRIMARY KEY,
          owner       TEXT NOT NULL DEFAULT 'demo',
          name        TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          items       JSONB NOT NULL DEFAULT '[]'::jsonb,
          blueprint   JSONB,
          generated   JSONB,
          demo        BOOLEAN NOT NULL DEFAULT false,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects (owner)`;
    })();
  }
  return ready;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToProject(r: any): Project {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    items: r.items ?? [],
    blueprint: r.blueprint ?? null,
    generated: r.generated ?? undefined,
    demo: r.demo ?? undefined,
    owner: r.owner,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function listProjects(owner: string): Promise<Project[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM projects WHERE owner = ${owner} ORDER BY updated_at DESC
  `;
  return rows.map(rowToProject);
}

export async function getProject(id: string, owner: string): Promise<Project | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM projects WHERE id = ${id} AND owner = ${owner} LIMIT 1
  `;
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function createProject(
  input: Pick<Project, "name" | "description"> & Partial<Pick<Project, "items">>,
  owner: string
): Promise<Project> {
  await ensureSchema();
  const sql = getSql();
  const id = crypto.randomUUID().slice(0, 8);
  const items = JSON.stringify(input.items ?? []);
  const rows = await sql`
    INSERT INTO projects (id, owner, name, description, items)
    VALUES (${id}, ${owner}, ${input.name}, ${input.description}, ${items}::jsonb)
    RETURNING *
  `;
  return rowToProject(rows[0]);
}

export async function updateProject(
  id: string,
  patch: Partial<Project>,
  owner: string
): Promise<Project | null> {
  await ensureSchema();
  const sql = getSql();
  const existing = await getProject(id, owner);
  if (!existing) return null;
  const next: Project = { ...existing, ...patch, id, owner };
  const rows = await sql`
    UPDATE projects SET
      name        = ${next.name},
      description = ${next.description},
      items       = ${JSON.stringify(next.items)}::jsonb,
      blueprint   = ${next.blueprint ? JSON.stringify(next.blueprint) : null}::jsonb,
      generated   = ${next.generated ? JSON.stringify(next.generated) : null}::jsonb,
      demo        = ${next.demo ?? false},
      updated_at  = now()
    WHERE id = ${id} AND owner = ${owner}
    RETURNING *
  `;
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function deleteProject(id: string, owner: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    DELETE FROM projects WHERE id = ${id} AND owner = ${owner} RETURNING id
  `;
  return rows.length > 0;
}
