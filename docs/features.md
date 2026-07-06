# Features

## Whiteboard (Board view)

The workspace opens on an infinite React Flow canvas. Eleven card types can be
added from the toolbar, by double-clicking empty canvas (idea card), or by
dragging files/URLs from the desktop:

| Card | Content | Notes |
| --- | --- | --- |
| Idea | free text | double-click canvas creates one |
| Requirement | user story text | |
| Code | pasted code | monospace editor |
| API spec | endpoint/contract text | |
| DB schema | table definitions | |
| GitHub repo | repository URL | server fetches metadata, file tree, README, package.json as blueprint context |
| Figma design | file URL | treated as design context |
| Screenshot | image file | stored as data URL; sent to vision-capable models |
| Document | notes/specs | dropped .md/.txt/.rst files become doc cards |
| Conversation | chat/meeting log | |
| Voice note | microphone recording | records audio and live-transcribes via the Web Speech API |

Dropped URLs are auto-typed (github.com → repo card, figma.com → figma card,
otherwise doc). Card edits autosave with an 800 ms debounce; the header shows
saving/saved state.

## Blueprint

"Build app" opens a modal offering Blueprint build (recommended) or Chat mode.
Blueprint build sends the entire board to the AI and produces:

- An architecture graph: nodes (pages, components, APIs, services, database
  tables, external integrations, design artifacts, docs) with status
  existing / partial / missing, connected by typed edges.
- PRD: vision, problem statement, target users, prioritised features,
  non-goals, success metrics.
- User flows, database schema, API architecture, frontend architecture,
  backend architecture, infrastructure plan, CI/CD pipeline, testing
  strategy, deployment plan.
- Project memory (constraints, technical decisions, open questions) and a
  context graph linking requirements to design to code.

The Blueprint view renders the graph on a canvas with a tabbed side panel:
Gaps, Summary (all sections above), and Graph (context graph).

## Gap detection and the living blueprint

Gaps are concrete findings — missing features, broken integrations,
architecture risks, security holes, data problems, UX holes — each with
severity (critical/high/medium/low), category, description, recommendation,
and links to the graph nodes involved.

- Generate code: streams a blueprint-validated implementation (multiple files
  as markdown sections) into a code panel. On completion the related nodes
  flip from missing to existing, edges upgrade, and the gap moves to a
  struck-through Resolved section — the blueprint is a living document.
- Live preview: generates a single self-contained React app demonstrating
  that gap's fix and boots it in the in-browser sandbox (see below).

## Build website (full site generation)

Available once a blueprint exists ("Build website" in the header; "Open
website" after the first build). Full-screen builder with three stages:

1. Plan — one AI call converts the blueprint into a file manifest
   (8–14 files: App.jsx with routes, Nav, one file per page, components,
   mock data, styles).
2. Generate — one AI call per file, each against the same manifest and
   blueprint context, with per-file validation and a single retry on
   failure. The file tree fills with live checkmarks.
3. Run — files are merged into a fixed Vite + React Router scaffold and
   mounted into the WebContainer; npm install and the dev server run
   in-browser; the finished site renders in an iframe.

Also in the builder: click any generated file to read its code, Download zip
(complete runnable project with README), Open in a new tab, Rebuild
(regenerate from scratch), and Push to GitHub. Generated sites persist on the
project, so reopening skips generation and boots directly.

## Live preview (single gap)

Every open gap has a Live preview button. A dedicated AI call produces one
self-contained App.jsx (imports from react only, inline styles, mock data)
demonstrating that gap's solution; it boots in the shared WebContainer inside
a slide-over panel with phase indicators, npm logs, a code toggle, and an
open-in-new-tab link.

## Ship to GitHub

The Ship dialog pushes generated work to a GitHub repository (created private
if it does not exist). Two modes, toggleable when both exist:

- Website: the complete generated site as a runnable repo — scaffold files,
  all src/ files, README, and a PEGASUS.md manifest. The success screen links
  the repo and suggests importing it at vercel.com/new.
- Gap artifacts: files parsed out of every generated gap implementation,
  plus PEGASUS.md.

Token resolution: the token pasted in the dialog, else the server
`GITHUB_TOKEN`. Needs repo scope.

## Chat

A build copilot with the full project as context: blueprint summary, PRD,
memory, gaps, board excerpts, and generated artifact titles. Streaming
responses. Openable from the workspace header or Cmd/Ctrl+K.

## Blueprint sharing

Overview → Share creates a 16-hex-char token and a public read-only page at
`/share/[token]` rendering every blueprint section with a sidebar nav and a
"Build yours" CTA. Sharing can be disabled, which invalidates the link. Only
public fields are exposed — board items and owner are never returned.

## Accounts and plans

- Email/password accounts (scrypt-hashed, JWT sessions) plus optional Google
  and GitHub OAuth. OAuth buttons are disabled until the provider is
  configured.
- Free plan: 2 new projects per rolling 7 days, enforced server-side
  (HTTP 429) and reflected in the dashboard pill ("N of 2 builds left"),
  a disabled create button at 0, and an upgrade modal. Demo/sample projects
  do not count.
- Settings: profile, AI keys (Gemini recommended free tier, Ollama URL/model,
  Anthropic collapsed as advanced), GitHub token. Keys are stored in
  localStorage only and forwarded per request as headers — never persisted
  server-side.

## Dashboard

Sidebar with recent builds and a sample-build seeder; stat cards (total
builds, blueprints ready, open gaps, artifacts) that double as filters;
search (Cmd/Ctrl+K), sort, rename, duplicate, delete; a quick-start prompt
box that creates a project with the idea as the first card (Cmd/Ctrl+N).

## Keyboard shortcuts (workspace)

| Shortcut | Action |
| --- | --- |
| Cmd/Ctrl+B | Build / rebuild app |
| Cmd/Ctrl+K | Toggle chat |
| Cmd/Ctrl+/ | Toggle board / blueprint view |
| Cmd/Ctrl+` | Toggle artifacts panel |
| Cmd/Ctrl+Shift+? | Shortcuts help |
| Escape | Close topmost overlay |

## Email

- Welcome email on signup (fire-and-forget from `/api/signup`).
- Contact form: notification to the configured inbox with reply-to set to
  the sender, plus a branded auto-reply. Both no-op gracefully when Resend
  is not configured.

## Theming

Light mode is the default regardless of OS preference; dark mode is opt-in
via the toggle and persists in localStorage.
