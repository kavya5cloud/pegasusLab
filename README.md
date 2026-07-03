# Pegasus Lab

The intelligence layer between ideas and software. Pegasus turns everything you
know about an application — ideas, code, GitHub repositories, Figma files,
screenshots, documents, API specs, and database schemas — into a living Product
Blueprint, finds the gaps in it, and generates the code to close them.

## What it does

- **Whiteboard.** Drop ideas, code snippets, repo links, Figma files, design
  screenshots, and notes onto an infinite canvas. Drag files straight from your
  desktop or double-click to jot an idea.
- **Blueprint.** Pegasus reads the whole board and produces a complete Product
  Blueprint: architecture graph, PRD, user flows, database schema, API and
  frontend/backend architecture, infrastructure, CI/CD, testing, and deployment
  plans.
- **Gap detection.** It surfaces every missing feature, broken integration,
  architecture risk, security hole, and UX gap, ranked by severity.
- **Code generation.** Generate the code that closes any gap, validated against
  the blueprint. As gaps close, the blueprint updates itself — nodes flip from
  missing to existing and edges upgrade.
- **Live preview.** Each gap can boot a self-contained React app in an in-browser
  WebContainer sandbox, so you see the fix running without a deploy.
- **Sharing.** Publish any blueprint to a public read-only link.
- **Chat.** Talk through the build with an assistant that has the full blueprint
  as context.

## Tech stack

- Next.js (App Router) and React
- TypeScript
- Tailwind CSS
- Auth.js (NextAuth) for authentication
- Neon (serverless Postgres) for storage, with a local JSON fallback
- Resend for transactional email
- WebContainers for the in-browser live preview
- Pluggable AI backend: Anthropic Claude, Google Gemini, Groq, or a local Ollama

## Getting started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The app runs out of the box in demo mode with no configuration. To enable real
AI analysis, accounts, and email, set the environment variables below.

## Configuration

Copy `.env.local.example` to `.env.local` and fill in what you need. Every
section is optional — the app degrades gracefully when a key is absent.

### AI backend

Set at least one. Priority order is Anthropic, then Gemini, then Groq, then
Ollama, then demo mode.

```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
GROQ_API_KEY=gsk_...
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
```

Users can also supply their own key from the Settings page; it is stored only in
their browser and forwarded per request.

### Authentication

Email and password accounts work out of the box. `AUTH_SECRET` is required in
production. OAuth providers are optional.

```
AUTH_SECRET=            # generate with: openssl rand -base64 32
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

For Google OAuth, add `<your-site>/api/auth/callback/google` as an authorized
redirect URI in the Google Cloud console.

### Database

Without `DATABASE_URL`, projects and accounts are stored in a local `.data/`
directory. With it, they live in Neon Postgres.

```
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
```

### Email

```
RESEND_API_KEY=re_...
RESEND_FROM=Pegasus Lab <hello@yourdomain.com>
RESEND_INBOX=you@yourdomain.com
```

### Site URL

```
NEXT_PUBLIC_SITE_URL=https://your-domain.com
AUTH_URL=https://your-domain.com
```

## Scripts

```bash
npm run dev      # start the development server
npm run build    # production build
npm run start    # run the production build
npm run lint     # run ESLint
```

## Plans

The free plan allows two new projects per week per account, with the full
board-to-blueprint-to-code loop and unlimited blueprints and chat. The limit is
enforced server-side.

## Deployment

The app is a standard Next.js application and deploys to Vercel (or any Node
host) with no extra configuration beyond the environment variables above. A
`vercel.json` and a `render.yaml` are included. Set at minimum `AUTH_SECRET` and
`DATABASE_URL` in production so accounts and sessions work.
