import type { Blueprint, Project } from "./types";

// Used when no ANTHROPIC_API_KEY is configured, so the product can be
// demoed end-to-end without credentials.
export function demoBlueprint(project: Project): Blueprint {
  const name = project.name || "Your App";
  return {
    summary: `${name} is a web application with a typical three-tier shape: a React frontend, an API layer, and a relational database. Core screens and APIs exist; authentication, billing, and observability are missing, and the notification flow is only half-wired. (Demo blueprint — set ANTHROPIC_API_KEY for real analysis.)`,
    techStack: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    nodes: [
      { id: "design-system", label: "Design System", type: "design", status: "partial", description: "Figma tokens exist but only half the components are mapped to code." },
      { id: "landing", label: "Landing Page", type: "page", status: "existing", description: "Marketing landing page with hero and pricing sections." },
      { id: "dashboard", label: "Dashboard", type: "page", status: "existing", description: "Main authenticated workspace view." },
      { id: "settings", label: "Settings Page", type: "page", status: "missing", description: "Account and workspace settings — referenced in nav but not built." },
      { id: "nav", label: "App Shell / Nav", type: "component", status: "existing", description: "Sidebar navigation and top bar." },
      { id: "data-table", label: "Data Table", type: "component", status: "partial", description: "Renders records but lacks pagination and filtering." },
      { id: "api-records", label: "GET/POST /api/records", type: "api", status: "existing", description: "CRUD endpoints for core records." },
      { id: "api-auth", label: "/api/auth/*", type: "api", status: "missing", description: "No authentication endpoints exist." },
      { id: "api-billing", label: "/api/billing/webhook", type: "api", status: "missing", description: "Stripe webhook receiver for subscription events." },
      { id: "svc-notifications", label: "Notification Service", type: "service", status: "partial", description: "Email templates exist; nothing actually sends them." },
      { id: "svc-jobs", label: "Background Jobs", type: "service", status: "missing", description: "No queue/worker for async work (emails, exports)." },
      { id: "db-users", label: "users", type: "database", status: "missing", description: "User table required for auth — not in schema." },
      { id: "db-records", label: "records", type: "database", status: "existing", description: "Core records table with owner foreign key." },
      { id: "db-subscriptions", label: "subscriptions", type: "database", status: "missing", description: "Subscription state synced from Stripe." },
      { id: "ext-stripe", label: "Stripe", type: "external", status: "missing", description: "Payments provider — planned but not integrated." },
      { id: "ext-email", label: "Email Provider", type: "external", status: "partial", description: "Resend account exists; API key not wired in." },
      { id: "docs-api", label: "API Docs", type: "doc", status: "partial", description: "README covers records API only." },
    ],
    edges: [
      { id: "e0", source: "design-system", target: "nav", label: "tokens", status: "partial" },
      { id: "e1", source: "landing", target: "api-auth", label: "sign up", status: "missing" },
      { id: "e2", source: "dashboard", target: "nav", label: "renders", status: "existing" },
      { id: "e3", source: "dashboard", target: "data-table", label: "renders", status: "existing" },
      { id: "e4", source: "data-table", target: "api-records", label: "fetch", status: "existing" },
      { id: "e5", source: "api-records", target: "db-records", label: "reads/writes", status: "existing" },
      { id: "e6", source: "api-auth", target: "db-users", label: "reads/writes", status: "missing" },
      { id: "e7", source: "api-billing", target: "ext-stripe", label: "webhooks", status: "missing" },
      { id: "e8", source: "api-billing", target: "db-subscriptions", label: "syncs", status: "missing" },
      { id: "e9", source: "svc-notifications", target: "ext-email", label: "sends via", status: "partial" },
      { id: "e10", source: "svc-jobs", target: "svc-notifications", label: "dispatches", status: "missing" },
      { id: "e11", source: "settings", target: "api-auth", label: "session", status: "missing" },
      { id: "e12", source: "dashboard", target: "api-auth", label: "session", status: "missing" },
    ],
    gaps: [
      {
        id: "gap-0",
        title: "No authentication system",
        severity: "critical",
        category: "security",
        description: "The dashboard and records API are completely unprotected. There is no users table, no session handling, and no auth endpoints.",
        recommendation: "Add auth (e.g. Auth.js or Clerk), create the users table, and gate /api/records and the dashboard behind a session.",
        relatedNodeIds: ["api-auth", "db-users", "dashboard", "api-records"],
      },
      {
        id: "gap-1",
        title: "Billing integration absent",
        severity: "high",
        category: "integration",
        description: "Pricing is shown on the landing page but Stripe is not integrated — no checkout, no webhook, no subscription state.",
        recommendation: "Integrate Stripe Checkout, add the /api/billing/webhook endpoint, and persist subscription state in a subscriptions table.",
        relatedNodeIds: ["ext-stripe", "api-billing", "db-subscriptions"],
      },
      {
        id: "gap-2",
        title: "Notifications never send",
        severity: "high",
        category: "missing-feature",
        description: "Email templates exist but no provider is wired in and no background worker dispatches them.",
        recommendation: "Wire the Resend API key, add a job queue, and dispatch transactional emails from the worker.",
        relatedNodeIds: ["svc-notifications", "ext-email", "svc-jobs"],
      },
      {
        id: "gap-3",
        title: "Data table lacks pagination",
        severity: "medium",
        category: "ux",
        description: "The records table loads all rows at once; it will degrade past a few hundred records.",
        recommendation: "Add cursor pagination to GET /api/records and infinite scroll or paging controls to the table.",
        relatedNodeIds: ["data-table", "api-records"],
      },
      {
        id: "gap-4",
        title: "Design system only partially mapped to code",
        severity: "low",
        category: "architecture",
        description: "Half the Figma components have no code counterpart, causing visual drift.",
        recommendation: "Generate the remaining components from design tokens and adopt them in the app shell.",
        relatedNodeIds: ["design-system", "nav"],
      },
    ],
  };
}

export const DEMO_CODE = `Closing this gap requires wiring the missing pieces end to end. Here is the generated integration (demo output — set ANTHROPIC_API_KEY for real, blueprint-aware code generation).

### lib/auth.ts
\`\`\`ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
\`\`\`

### app/api/auth/[...nextauth]/route.ts
\`\`\`ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
\`\`\`

### Wiring it up
- \`npm install next-auth@beta\`
- Add \`AUTH_SECRET\` and \`AUTH_GITHUB_ID\` / \`AUTH_GITHUB_SECRET\` to .env.local
- Wrap protected routes with the exported \`auth\` middleware.
`;

export function demoChatReply(question: string): string {
  return [
    `Good question. (Demo mode — set ANTHROPIC_API_KEY for the real build copilot.)`,
    ``,
    `Here is how I would approach "${question.slice(0, 80)}":`,
    ``,
    `1. Close the critical gap first — authentication. Nothing else on the blueprint is safe to ship while the records API is open.`,
    `2. Wire billing next: the Stripe webhook and a subscriptions table unlock revenue, and both are isolated from the rest of the graph.`,
    `3. Notifications and pagination are fast follows — each is a one-card fix on the board.`,
    ``,
    `Open the Gaps panel in Blueprint view and hit "Generate code" on any of these — I will write the integration end to end.`,
  ].join("\n");
}
