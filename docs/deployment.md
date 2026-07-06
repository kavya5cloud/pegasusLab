# Deployment

The app is a standard Next.js application. The reference setup is Vercel for
the app, Neon for Postgres, Resend for email, with an optional Render service
as an alternative host. `vercel.json` and `render.yaml` are included.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | Yes (production) | Signs session JWTs. Generate: `openssl rand -base64 32`. Auth breaks without it — Auth.js returns a Configuration error page. |
| `DATABASE_URL` | Yes (production) | Neon pooled connection string. Without it, storage is a local file — which does not persist on serverless. |
| `GOOGLE_API_KEY` | Strongly recommended | Server-side Gemini for all users. Without any AI key the product runs in demo mode. |
| `GEMINI_MODEL` | No | Default `gemini-2.0-flash`. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | No | Claude backend (takes priority over Gemini). |
| `GROQ_API_KEY` / `GROQ_MODEL` | No | Groq backend. |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | No | Local/remote Ollama backend. |
| `AUTH_URL` | Recommended | Canonical site URL for Auth.js callbacks (v5 name; `NEXTAUTH_URL` is ignored). E.g. `https://pegasuslab.in`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | No | Enables the Google sign-in button. |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | No | Enables the GitHub sign-in button. |
| `RESEND_API_KEY` | No | Enables welcome + contact emails. |
| `RESEND_FROM` | No | Verified sender, e.g. `Pegasus Lab <hello@pegasuslab.in>`. |
| `RESEND_INBOX` | No | Where contact-form notifications land. |
| `GITHUB_TOKEN` | No | Server-wide fallback for repo context fetching and shipping. For a public product prefer per-user tokens pasted in the UI. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Used in OG tags and emails. |

Email/password accounts work with only `AUTH_SECRET` + `DATABASE_URL`; every
other integration degrades gracefully when absent.

## Vercel

1. Import the GitHub repository at vercel.com/new (framework auto-detected).
2. Set the environment variables above (Production scope).
3. Every push to `main` auto-deploys. Environment variable changes require a
   redeploy to take effect.

`vercel.json` repeats the COOP/COEP headers for `/project/:path*` (also set
in `next.config.ts`) — these are required for the in-browser WebContainer
previews and are deliberately scoped so OAuth and marketing pages are
unaffected.

## Neon

Create a project at neon.tech and use the pooled connection string as
`DATABASE_URL`. No manual schema setup: tables and indexes are created
idempotently on first use, and later columns are added with
`ADD COLUMN IF NOT EXISTS` migrations baked into `lib/db.ts`.

## Resend

1. Create an API key.
2. Verify the sending domain (Domains → add DNS records) before using a
   custom `RESEND_FROM`; until then Resend rejects the address
   (`onboarding@resend.dev` works unverified for testing).

## Google OAuth

Google Cloud Console → APIs & Services → Credentials → OAuth client:

- Authorized JavaScript origins: the site origin(s), e.g.
  `https://pegasuslab.in` and the vercel.app domain.
- Authorized redirect URIs (exact match required — a mismatch produces
  `Error 400: redirect_uri_mismatch`):
  `https://<domain>/api/auth/callback/google` for every domain in use,
  plus `http://localhost:3000/api/auth/callback/google` for development.

Set `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` and redeploy. A `Configuration`
error at `/api/auth/error` after the Google consent screen almost always
means `AUTH_SECRET` is missing from the running deployment.

## Custom domain (registrar → Vercel)

1. Vercel project → Settings → Domains → add the apex and `www`
   (www redirecting to apex).
2. At the registrar's DNS panel, remove parking records and add the records
   Vercel displays — currently an `A` record at `@` and a per-project
   `CNAME` for `www` (copy the exact values from the Domains screen).
3. Wait for propagation; Vercel auto-issues SSL. Then update `AUTH_URL`,
   `NEXT_PUBLIC_SITE_URL`, and the Google OAuth redirect URIs to the new
   domain and redeploy.

## Render (alternative host)

`render.yaml` defines a Node web service (`npm install && npm run build`,
`npm start`, health check `/api/status`) with the env var manifest. Render
sets `NODE_ENV=production` during install, which skips devDependencies but
the build needs them — set `NPM_CONFIG_PRODUCTION=false` or use
`npm install --include=dev` as the build command.

## Production smoke test

1. `/api/status` returns `demo:false`, `db:true`.
2. Sign up with a fresh email → lands on the dashboard, "2 of 2 builds
   left" pill.
3. Create a project → Build app → blueprint with gaps (no demo banner).
4. Build website → files generate → site goes Live in the iframe →
   Download zip runs locally.
5. Push to GitHub with a repo-scope token → repo exists and runs.
6. Contact form → notification + auto-reply arrive.
7. Share a blueprint → open the `/share/<token>` link signed out.
