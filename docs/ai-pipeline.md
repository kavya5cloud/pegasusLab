# AI Pipeline

All AI logic lives in `lib/claude.ts`. Nothing else in the codebase talks to a
model provider directly.

## Backends

| Backend | Trigger | Client |
| --- | --- | --- |
| Anthropic Claude | `ANTHROPIC_API_KEY` or `x-anthropic-key` header | `@anthropic-ai/sdk` |
| Google Gemini | `GOOGLE_API_KEY` or `x-google-key` header | `@google/genai` |
| Groq | `GROQ_API_KEY` | OpenAI SDK against `api.groq.com/openai/v1` |
| Ollama | `OLLAMA_BASE_URL`/`OLLAMA_MODEL` or `x-ollama-url`/`x-ollama-model` headers | OpenAI SDK against the local endpoint |
| Demo | none of the above | hardcoded outputs from `lib/demo.ts` |

Selection order: per-request user keys win (`resolveBackend()`:
anthropic → gemini → ollama), then server env (`getBackend()`:
anthropic → gemini → groq → ollama → demo).

Per-request keys come from Settings, are stored only in the browser
(localStorage), and are attached by `userApiHeaders()` in `lib/auth.ts` to
every AI request. The server uses them for that request only and never
persists them.

`isDemoMode()` gates every AI route: with no server key and no user key, the
route returns the demo fallback instead of erroring, so the product is fully
navigable unconfigured.

## Model routing (Anthropic)

Pegasus routes each cognitive task to an appropriate Claude tier
(`ANTHROPIC_MODELS` in `lib/claude.ts`), overridable with `ANTHROPIC_MODEL`:

| Task | Model |
| --- | --- |
| understand, architecture, design-analysis | claude-opus-4-8 |
| codegen, validate, chat | claude-sonnet-4-6 |
| testing, docs | claude-haiku-4-5 |

Gemini uses `GEMINI_MODEL` (default `gemini-2.0-flash`) for all tasks; Groq
and Ollama use their configured single model.

## Generation functions

### `generateBlueprint(project, githubContext, keys)`

Board → Blueprint. Assembles every card into a structured prompt (GitHub
cards get fetched repo context appended; image cards become vision inputs on
Anthropic). Output is parsed against `BlueprintSchema` (zod): the
architecture graph plus PRD, user flows, database schema, API/frontend/
backend architecture, infrastructure, CI/CD, testing, deployment, project
memory, and context graph. Anthropic uses native structured output
(`messages.parse`); Gemini and OpenAI-compatible backends use a JSON-only
instruction suffix plus `JSON.parse` and the same zod schema.

### `streamGapCode(project, gap, keys)`

Streams a full implementation for one gap. Context: the blueprint (single
source of truth), board excerpts, and the gap. Output format is enforced by
`CODEGEN_SYSTEM`: a blueprint-validation paragraph, then each file as a
`### path` heading with a fenced code block (this exact format is what
`lib/ship.ts` parses when shipping artifacts), then wiring notes.

### `generatePreviewApp(project, gap, keys)`

One self-contained App.jsx demonstrating a gap fix, for the WebContainer
preview. `PREVIEW_SYSTEM` constraints: imports from react only, no network,
inline styles, mock data, interactive. The API route falls back to the demo
app if the output lacks `export default`.

### `generateSitePlan(project, keys)` and `generateSiteFile(project, plan, file, keys)`

The full-website pipeline. Design principle: many small, verifiable calls
instead of one large one — this is what keeps free-tier models reliable.

Plan: `SITE_PLAN_SYSTEM` turns a compact blueprint context (`siteContext()`:
name, PRD, user flows, page/component nodes, data entities, design system)
into strict JSON `{files: [{path, purpose}]}`. The result is zod-validated,
normalised to `src/`, and required files are force-included: `src/App.jsx`,
`src/components/Nav.jsx`, `src/data/mock.js`, `src/styles.css`.

File: `SITE_FILE_SYSTEM` writes exactly one file given the blueprint context,
the full manifest (the contract every file must agree with), and the target
file's purpose. Constraints: plain JS + JSX; imports only from react,
react-router-dom, or manifest files via relative paths with extensions;
default exports; no BrowserRouter in App.jsx (the scaffold's main.jsx
provides it); Tailwind utility classes; no network calls; mock data only
from `src/data/mock.js`.

Validation (`validateSiteFile()`): non-empty; `.jsx` must contain a default
export; App.jsx must not contain BrowserRouter; imports must match the
allowlist regex. On failure, one retry with the specific problem appended to
the prompt.

### `streamChat(project, messages, keys)`

Build copilot. System prompt embeds a JSON project context: blueprint
summary, node list, gaps, PRD, memory, flow outcomes, board excerpts
(truncated), artifact titles. Last 30 turns are kept.

## Scaffolds: why generations cannot break the build

Two fixed shells wrap all generated code:

- `lib/preview-scaffold.ts` (gap previews): Vite + React, the AI supplies
  only App.jsx.
- `lib/site-scaffold.ts` (websites): Vite + React + React Router, index.html
  loads the Tailwind CDN, main.jsx renders App inside BrowserRouter and
  imports styles.css (guaranteed present). The AI supplies only `src/` files.

The toolchain is therefore never model-generated; a bad generation can break
one page, not the build.

## Execution: WebContainers

Generated apps run in a WebContainer — an in-browser Node.js runtime — so no
server-side execution or per-user sandboxes exist anywhere.

- Requires cross-origin isolation; COOP/COEP headers are scoped to
  `/project/:path*` (see architecture.md).
- One instance per page: `lib/webcontainer.ts` boots lazily and shares the
  instance between LivePreview and SiteBuilder; npm caches carry across runs
  (first install ~30–90 s, subsequent much faster).
- Lifecycle per run: mount file tree → `npm install` → `npm run dev` →
  `server-ready` event supplies the URL for the `credentialless` iframe.
  Dev processes are killed on unmount; output streams into the log panel
  with ANSI escape stripping.

## Cost model

- Blueprint: 1 call. Gap code: 1 streamed call. Preview: 1 call.
  Website: 1 plan call + 1 call per file (typically 9–14) + up to 1 retry
  each. Chat: 1 streamed call per message.
- With `GOOGLE_API_KEY` on the free tier, a full build (blueprint + website)
  is roughly a dozen small calls — comfortably inside free quotas at the
  product's 2-builds-per-week cap.
- Users can bring their own key (any backend) which is used instead of the
  server key for their requests.
