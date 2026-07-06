# Architecture

## System overview

```
Browser
├── Marketing pages           /  /pricing  /contact  /auth
├── Dashboard                 /projects
├── Workspace                 /project/[id]
│     ├── Board (whiteboard, React Flow)
│     ├── BlueprintCanvas (architecture graph)
│     ├── GapPanel / CodePanel / ChatPanel
│     ├── LivePreview   (WebContainer: one gap demo app)
│     └── SiteBuilder   (WebContainer: full generated website)
└── Public share view         /share/[token]

Next.js API routes (serverless)
├── /api/auth/[...nextauth]   Auth.js: credentials + Google + GitHub
├── /api/signup               account creation (scrypt-hashed passwords)
├── /api/projects*            CRUD, weekly limit, blueprint, chat,
│                             codegen, preview, site plan/file, share, ship
├── /api/contact              Resend email
├── /api/sample               seeded showcase project
└── /api/status               backend/auth/db status probe

lib/ (shared server + client logic)
├── claude.ts        AI facade: backends, model routing, prompts, generators
├── store.ts         storage facade → db.ts (Neon) or .data/*.json (files)
├── db.ts            Neon Postgres: schema, migrations, queries
├── auth.ts          client session cache + userApiHeaders()
├── session.ts       server-side owner resolution from the Auth.js session
├── password.ts      scrypt hash/verify (Node stdlib, no native deps)
├── demo.ts          demo blueprint / code / preview app / full site
├── site-scaffold.ts fixed Vite + React Router shell for generated sites
├── preview-scaffold.ts  fixed Vite shell for single-gap preview apps
├── webcontainer.ts  shared WebContainer boot singleton
├── ship.ts          artifacts→files and site→files converters for GitHub
├── github.ts        public repo context fetcher for whiteboard cards
├── resend.ts        transactional email (welcome, contact)
└── types.ts         all domain types

External services (all optional)
├── AI: Anthropic / Google Gemini / Groq / Ollama
├── Neon Postgres (storage)
├── Resend (email)
├── GitHub API (repo context in, generated repos out)
└── Firebase Analytics
```

## Request flow: the core loop

1. `Workspace` loads a project via `GET /api/projects/[id]`. Board edits are
   debounced (800 ms) into `PATCH /api/projects/[id]`.
2. "Build app" posts to `/api/projects/[id]/blueprint`. The route gathers
   GitHub context for repo cards, then calls `generateBlueprint()` which
   returns a zod-validated `Blueprint` (structured output). Stored on the
   project.
3. Gap actions stream: `/generate` streams markdown+code for one gap;
   on completion the client flips related blueprint nodes to `existing`,
   marks the gap resolved, and PATCHes the blueprint back (living blueprint).
4. "Build website" runs the two site routes (`/site/plan`, then `/site/file`
   once per manifest entry — the client orchestrates the loop), persists the
   result on the project, then mounts scaffold + files into the WebContainer.
5. "Ship" posts to `/ship` with `what: "site" | "artifacts"`; the route
   creates/updates a GitHub repo via the contents API.

## Key decisions and why

**Client-orchestrated generation loops.** The website builder calls one API
route per file instead of one long request. Each serverless invocation stays
small (no timeout risk), progress is naturally streamable in the UI, and a
single file failure does not lose the whole build.

**Fixed scaffolds, generated content.** For both the gap preview and the full
site, the toolchain files (package.json, vite config, index.html, main.jsx)
are hardcoded in `lib/*-scaffold.ts`. The AI only ever generates application
files, so a generation mistake can break a page but never the build system.

**One WebContainer per page.** The WebContainer API allows a single instance
per page. `lib/webcontainer.ts` exposes a module-level `getContainer()`
singleton shared by `LivePreview` and `SiteBuilder`; npm install caches are
reused and a second boot never throws.

**Cross-origin isolation is scoped.** WebContainers require COOP/COEP
headers, which break OAuth popups and cross-origin images elsewhere. The
headers (`Cross-Origin-Opener-Policy: same-origin`,
`Cross-Origin-Embedder-Policy: credentialless`) are applied only to
`/project/:path*` in `next.config.ts` (duplicated in `vercel.json`). Preview
iframes use the `credentialless` attribute.

**Storage facade with a file fallback.** `lib/store.ts` routes every call to
Neon when `DATABASE_URL` is set, otherwise to `.data/projects.json` and
`.data/users.json`. Development needs no database; production gets Postgres
with the same call sites.

**JWT sessions, no auth database tables from Auth.js.** Auth.js runs with
`session: { strategy: "jwt" }`. Users created through email/password signup
live in our own `users` table (or users.json) with scrypt-hashed passwords;
OAuth identities never touch the database. `getOwner()` resolves the session
email server-side and scopes every storage call by it.

**Demo fallbacks everywhere.** `isDemoMode()` is true when no AI key is
configured. Every AI route returns a realistic hardcoded result in demo mode
(blueprint, gap code, preview app, full 9-file site), so the product can be
demoed and developed with zero keys.

## Directory layout

```
app/                    routes (pages + API)
components/             all React components (client)
lib/                    shared logic (see table above)
docs/                   this documentation
public/                 static assets (logo, share images)
.data/                  local file storage (gitignored)
auth.ts                 Auth.js configuration (root, imported as @/auth)
next.config.ts          COOP/COEP headers for /project/*
vercel.json             Vercel config (headers, framework)
render.yaml             Render blueprint (node service, env var manifest)
```
