# Data Model

All domain types live in `lib/types.ts`. Storage goes through the facade in
`lib/store.ts`: Neon Postgres (`lib/db.ts`) when `DATABASE_URL` is set,
otherwise JSON files under `.data/` (gitignored).

## Core types

### Project

```ts
interface Project {
  id: string;                 // 8-char uuid slice
  name: string;
  description: string;
  items: BoardItem[];         // the whiteboard
  blueprint: Blueprint | null;
  generated?: GeneratedArtifact[];  // gap implementations
  site?: GeneratedSite;             // the built website
  demo?: boolean;             // produced in demo mode / sample project
  owner?: string;             // session email, or "demo"
  shareId?: string;           // public share token when sharing is enabled
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}
```

### BoardItem

```ts
interface BoardItem {
  id: string;
  kind: ItemKind;   // idea | code | github | figma | image | doc | voice |
                    // requirement | api | database | conversation
  title: string;
  content: string;  // text, URL, or transcript depending on kind
  dataUrl?: string; // base64 data URL for image/voice cards
  x: number;        // canvas position
  y: number;
}
```

### Blueprint

The structured output of blueprint generation (zod-validated end to end):

```ts
interface Blueprint {
  summary: string;
  techStack: string[];
  nodes: BlueprintNode[];   // {id,label,type,status,description,tech?}
                            // type: page|component|api|service|database|
                            //       external|design|doc
                            // status: existing|partial|missing
  edges: BlueprintEdge[];   // {id,source,target,label?,status}
  gaps: Gap[];
  prd?, userFlows?, databaseSchema?, apiArchitecture?,
  frontendArchitecture?, backendArchitecture?, infrastructurePlan?,
  cicdPipeline?, testingStrategy?, deploymentPlan?,
  memory?, contextGraph?    // full shapes in lib/types.ts
}

interface Gap {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "missing-feature" | "integration" | "architecture" |
            "security" | "data" | "ux";
  description: string;
  recommendation: string;
  relatedNodeIds: string[];
  resolved?: boolean;       // set by the living-blueprint sync
}
```

### GeneratedArtifact

```ts
interface GeneratedArtifact {
  id: string;
  gapId: string;
  title: string;
  content: string;          // markdown: "### path" + fenced code per file
  satisfies?: string[];
  blueprintValidated?: boolean;
  createdAt: string;
}
```

### GeneratedSite

```ts
interface SitePlanFile { path: string; purpose: string; }
interface SiteFile     { path: string; code: string; }

interface GeneratedSite {
  plan: SitePlanFile[];     // the manifest the AI generated against
  files: SiteFile[];        // all generated src/ files
  generatedAt: string;
}
```

### UserRecord (credentials auth)

```ts
interface UserRecord {
  email: string;            // primary key, lowercased
  name: string;
  passwordHash: string;     // scrypt, "salt:hash" hex
}
```

## Postgres schema (lib/db.ts)

Schema is ensured lazily once per cold start (`ensureSchema()`), with
idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations for columns
added after launch (`share_id`, `site`).

```sql
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  owner       TEXT NOT NULL DEFAULT 'demo',
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  blueprint   JSONB,
  generated   JSONB,
  site        JSONB,
  demo        BOOLEAN NOT NULL DEFAULT false,
  share_id    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects (owner);
CREATE UNIQUE INDEX IF NOT EXISTS projects_share_id_idx
  ON projects (share_id) WHERE share_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS users (
  email         TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Blueprint, items, generated artifacts, and the site are stored as JSONB blobs
rather than normalised tables: they are read and written whole, always
per-project, and their shapes evolve with the AI prompts — JSONB keeps
migrations near zero.

## Storage facade (lib/store.ts)

| Function | Notes |
| --- | --- |
| `listProjects(owner)` | newest first |
| `getProject(id, owner)` | owner-scoped |
| `createProject(input, owner)` | |
| `updateProject(id, patch, owner)` | bumps `updatedAt` |
| `deleteProject(id, owner)` | |
| `getProjectByShareId(shareId)` | public share lookup, not owner-scoped |
| `countProjectsThisWeek(owner)` | trailing 7 days, excludes `demo` rows — the free-plan limit |
| `getUserByEmail(email)` / `createUser(user)` | credentials auth |

File fallback: `.data/projects.json` and `.data/users.json`, same semantics.
Legacy projects without an owner are treated as owner `"demo"`.

## Ownership and privacy

- `getOwner()` (lib/session.ts) resolves the Auth.js session email on every
  request; unauthenticated requests act as owner `"demo"`.
- Every project query filters by owner at the storage layer, not in the UI.
- The public share endpoint returns a whitelisted subset (name, description,
  blueprint) — board items, owner, and generated code are never exposed.
- User AI keys are never stored server-side; they live in the browser's
  localStorage and travel only as per-request headers.
- Passwords are scrypt-hashed (Node stdlib, 16-byte random salt, 64-byte
  key, constant-time compare). No plaintext ever persists.
