# API Reference

All routes are Next.js route handlers under `app/api/`. Requests and
responses are JSON unless noted. Authentication is the Auth.js session
cookie; every project route resolves the owner server-side via `getOwner()`
(session email, or `"demo"` when unauthenticated) and scopes storage by it.

## AI key headers

Any AI-backed route accepts per-request user keys, forwarded from the
browser by `userApiHeaders()`:

| Header | Meaning |
| --- | --- |
| `x-anthropic-key` | Anthropic API key |
| `x-google-key` | Google Gemini API key |
| `x-ollama-url` | Ollama base URL (OpenAI-compatible endpoint) |
| `x-ollama-model` | Ollama model name |
| `x-github-token` | GitHub token (repo context fetching) |

Priority per request: anthropic → gemini → ollama → server environment →
demo mode.

## Auth and accounts

### `GET/POST /api/auth/[...nextauth]`
Auth.js handlers: credentials provider (email/password against the users
store), plus Google and GitHub OAuth when configured. JWT sessions.

### `POST /api/signup`
Create an account.
Body: `{ name?, email, password }`.
Validation: email format; password length ≥ 6.
Responses: `201 {ok:true}`; `400` invalid input; `409` duplicate email.
Side effect: fire-and-forget welcome email when Resend is configured.

## Projects

### `GET /api/projects`
List the owner's projects, newest first. → `Project[]`

### `POST /api/projects`
Create a project.
Body: `{ name, description?, items? }`.
Enforces the free-plan limit: more than 2 non-demo projects created in the
trailing 7 days →
`429 {error:"weekly_limit", limit:2, used, message}`.
→ `201 Project`

### `GET /api/projects/[id]`
Fetch one project (owner-scoped). → `Project` or `404`.

### `PATCH /api/projects/[id]`
Partial update. Accepted fields: `items`, `generated`, `blueprint`, `site`,
`name`, `description`. → updated `Project`.

### `DELETE /api/projects/[id]`
→ `{ok: boolean}`.

## AI routes (all owner-scoped, all demo-fallback)

### `POST /api/projects/[id]/blueprint`
Generate the Product Blueprint from the whole board. Fetches GitHub context
for repo cards first. Persists `{blueprint, demo}` on the project.
→ updated `Project`. `maxDuration 300`.

### `POST /api/projects/[id]/generate`
Stream implementation code for one gap.
Body: `{gapId}`.
→ `text/plain` stream (markdown with `### path` + fenced code blocks).
`404` unknown gap. `maxDuration 300`.

### `POST /api/projects/[id]/preview`
Generate a self-contained App.jsx demonstrating a gap fix, for the
WebContainer preview.
Body: `{gapId}`. → `{code}`. Falls back to the demo app if the model output
is unusable. `maxDuration 120`.

### `POST /api/projects/[id]/site/plan`
Produce the website file manifest from the blueprint.
→ `{plan: [{path, purpose}], demo: boolean}`. `404` if no blueprint.
`maxDuration 120`.

### `POST /api/projects/[id]/site/file`
Generate one website file.
Body: `{plan: SitePlanFile[], file: SitePlanFile}`.
→ `{code}`. `400` missing plan/file. The client loops this route over the
manifest and then PATCHes the assembled `site` onto the project.
`maxDuration 120`.

### `POST /api/projects/[id]/chat`
Streaming build copilot.
Body: `{messages: [{role:"user"|"assistant", content}]}` (last 30 kept;
last must be user).
→ `text/plain` stream. `maxDuration 300`.

## Sharing

### `POST /api/projects/[id]/share`
Toggle public sharing.
Body: `{enable: boolean}`.
Enable generates a 16-hex-char `shareId`; disable clears it.
→ `{shareId: string | null}`.

### `GET /api/share/[token]`
Public, unauthenticated blueprint read. Returns only public fields (name,
description, blueprint) — never board items or owner. `404` unknown token.

## Shipping

### `POST /api/projects/[id]/ship`
Push generated work to GitHub.
Body: `{repo, token?, what?: "site" | "artifacts"}` (default artifacts;
token falls back to server `GITHUB_TOKEN`).
Behaviour: creates the repo private if missing (422 → already exists, ships
into it), then PUTs each file via the contents API (update with sha when the
file exists).
File sets: `what:"site"` → complete runnable site repo (scaffold + src +
PEGASUS.md); `what:"artifacts"` → files parsed from gap implementations +
PEGASUS.md.
→ `{url, files: string[], failed: number}`.
Errors: `400` missing token/repo/nothing to ship; `401` bad token;
`502` repo creation failed. `maxDuration 300`.

## Misc

### `POST /api/contact`
Contact/sales form. Body: `{name, email, company?, teamSize?, message?}`.
Sends inbox notification (reply-to sender) + auto-reply via Resend; no-ops
with `{ok:true}` when Resend is unconfigured.

### `POST /api/sample`
Seed a complete showcase project (board + demo blueprint + one artifact),
flagged `demo:true` so it never counts against the weekly limit.
→ `Project`.

### `GET /api/status`
→ `{demo, backend, auth: {google, github}, db}` — used by the UI to decide
demo banners and OAuth button state.
