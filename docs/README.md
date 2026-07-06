# Pegasus Lab Documentation

Pegasus Lab is the intelligence layer between ideas and software. Users drop
everything they know about an application — ideas, code snippets, GitHub
repositories, Figma links, screenshots, documents, API specs, database
schemas, voice notes — onto a whiteboard. Pegasus turns that context into a
validated Product Blueprint, detects the gaps in it, generates the code that
closes them, and builds the complete website — running live in the browser and
deliverable as a zip or a GitHub repository.

## Contents

| Document | Covers |
| --- | --- |
| [architecture.md](architecture.md) | System design, directory layout, request flow, key decisions |
| [features.md](features.md) | Every user-facing feature and how it behaves |
| [ai-pipeline.md](ai-pipeline.md) | AI backends, model routing, prompts, the website generation loop |
| [api.md](api.md) | Full HTTP API reference |
| [data-model.md](data-model.md) | TypeScript types, database schema, storage facade |
| [deployment.md](deployment.md) | Environment variables, Vercel/Render/Neon setup, domain, OAuth |
| [development.md](development.md) | Local setup, demo mode, scripts, conventions |

## The product in one paragraph

Where prompt-to-code tools (Bolt, Lovable, v0) go straight from a prompt to
code and drift on anything non-trivial, Pegasus inserts a validated
architecture step in the middle. The whiteboard's full context becomes a
Product Blueprint — PRD, user flows, database schema, API design, frontend and
backend architecture. Every downstream generation (gap fixes, live previews,
the full website) is produced against that blueprint, so pages, routes,
components, and data always agree. The blueprint is also a living document:
as generated code closes gaps, nodes flip from missing to existing and the
architecture graph updates itself.

## Quick orientation

- Next.js App Router application; all server logic lives in `app/api/*` route
  handlers — there is no separate backend service.
- AI calls go through a single facade (`lib/claude.ts`) that supports
  Anthropic Claude, Google Gemini, Groq, and local Ollama, selected by
  environment or per-request user keys.
- Storage is Neon Postgres when `DATABASE_URL` is set, otherwise a local JSON
  file — the same facade (`lib/store.ts`) serves both.
- Generated apps run client-side in a WebContainer (in-browser Node.js), so
  live previews need no server-side execution at all.
- Every AI feature has a demo fallback, so the entire product works with zero
  configuration.
