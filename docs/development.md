# Development

## Setup

```bash
git clone https://github.com/kavya5cloud/pegasusLab.git
cd pegasusLab
npm install
npm run dev
```

Open http://localhost:3000. With no configuration the app runs fully in demo
mode: accounts store in `.data/users.json`, projects in
`.data/projects.json`, and every AI feature returns realistic hardcoded
output (blueprint, gap code, preview app, a complete 9-file website), so all
flows are testable offline.

To develop against real AI, copy `.env.local.example` to `.env.local` and set
one key (`GOOGLE_API_KEY` is the recommended free tier). See
[deployment.md](deployment.md) for the full variable table.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | dev server (Turbopack) |
| `npm run build` | production build — must pass before shipping |
| `npm run start` | serve the production build |
| `npm run lint` | ESLint (`npx eslint .`) — repo lints clean; keep it that way |
| `npx tsc --noEmit` | type check |

## Conventions

- **Storage access only through `lib/store.ts`.** Never import `lib/db.ts`
  from routes/components; the facade is what keeps the file fallback working.
- **AI access only through `lib/claude.ts`.** New AI features add a function
  there (reuse `completeText()` for one-shot calls) plus a demo fallback in
  `lib/demo.ts`, and accept `OverrideKeys` so user keys keep working.
- **Every AI route follows the same shape:** resolve owner → load project →
  read override-key headers → demo-mode check → generate → persist/stream.
  Copy an existing route (`site/plan` is the smallest) when adding one.
- **Long generations are client-orchestrated loops** over small API calls,
  not single long requests (serverless timeouts, streamable progress).
- **Generated code runs inside fixed scaffolds** (`lib/*-scaffold.ts`); never
  let a model generate toolchain files.
- **One WebContainer per page** — always obtain it via
  `lib/webcontainer.ts#getContainer()`, kill spawned dev processes on
  unmount.
- **Types-first:** domain shapes live in `lib/types.ts`; blueprint-shaped AI
  output must be zod-validated in `lib/claude.ts` before it is trusted.
- **Styling:** Tailwind utilities plus the CSS variables defined in
  `app/globals.css` (`--paper`, `--ink`, `--panel`, `--line`, `--accent`,
  etc.). Light mode is the default; dark mode is a `dark` class on `<html>`
  toggled by `components/ThemeToggle.tsx`.
- **Mount-time init from URL/localStorage happens in effects** (SSR-safe);
  the `react-hooks/set-state-in-effect` rule is intentionally disabled in
  `eslint.config.mjs` for this reason. The other react-hooks rules are
  enforced — no nested component definitions, no ref writes during render.

## Testing changes

There is no test suite; verification is a browser pass plus static checks:

1. `npx tsc --noEmit` and `npx eslint .` — both must be clean.
2. `npm run build` — must compile.
3. Exercise the affected flow in the browser. Demo mode covers everything
   except real-model output quality.

Useful local details:

- Weekly-limit testing: the limit counts non-demo projects created in the
  trailing 7 days; edit `.data/projects.json` timestamps to reset.
- WebContainer flows need the workspace route (`/project/[id]`) because the
  COOP/COEP headers are scoped to it — `window.crossOriginIsolated` must be
  `true` there.
- The sample build (`POST /api/sample` or "Load sample build" in the
  dashboard sidebar) seeds a full project instantly and never counts against
  the limit.

## Adding a new AI backend

1. Extend the `Backend` union and `getBackend()` in `lib/claude.ts`.
2. Add a client factory and wire it into `completeText()`, the three
   streaming functions, and `generateBlueprint*`.
3. Extend `OverrideKeys` + header parsing in the AI routes and
   `userApiHeaders()` in `lib/auth.ts` if users may bring their own key.
4. Add the env vars to `.env.local.example` and the Settings page.

## Adding a new blueprint section

1. Add the zod schema in `lib/claude.ts` and the type in `lib/types.ts`.
2. Mention it in `BLUEPRINT_SYSTEM` so models populate it.
3. Render it in `components/Workspace.tsx` (Summary tab) and, if public, in
   `app/share/[token]/page.tsx`.
4. Consider feeding it to `siteContext()` if the website builder should use
   it.
