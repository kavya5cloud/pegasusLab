import type { Blueprint, Gap, Project } from "./types";

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

/**
 * A polished, self-contained interactive App.jsx for the live preview when no
 * API key is set. Demonstrates a working auth flow themed to the gap. Uses no
 * JS template literals so it embeds safely in this template string; gap text is
 * injected as JSON-encoded JSX expressions.
 */
export function demoPreviewApp(gap: Gap): string {
  const heading = JSON.stringify(gap.title);
  const reco = JSON.stringify(gap.recommendation || "Pegasus generates an interactive demo of this fix.");
  return `import React, { useState } from "react";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");

  const valid = email.includes("@") && password.length >= 6;

  function submit(e) {
    e.preventDefault();
    if (!valid) { setStatus("error"); return; }
    setStatus("loading");
    setTimeout(function () { setStatus("success"); }, 900);
  }

  const label = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", margin: "14px 0 6px" };
  const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" };
  const primary = { width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 14 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#eef2ff,#faf5ff)", padding: 24 }}>
      <div style={{ width: 380, background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", padding: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#6366f1", fontWeight: 700, marginBottom: 10 }}>Pegasus Preview</div>
        <h1 style={{ margin: "0 0 6px", fontSize: 21 }}>{${heading}}</h1>
        <p style={{ margin: "0 0 18px", color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>{${reco}}</p>
        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px" }}>✓</div>
            <div style={{ fontWeight: 600 }}>Signed in as {email}</div>
            <button onClick={function () { setStatus("idle"); }} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>Sign out</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={label}>Email</label>
            <input value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="you@company.com" style={input} />
            <label style={label}>Password</label>
            <input type="password" value={password} onChange={function (e) { setPassword(e.target.value); }} placeholder="At least 6 characters" style={input} />
            {status === "error" ? (
              <div style={{ color: "#dc2626", fontSize: 12, marginTop: 10 }}>Enter a valid email and a 6+ character password.</div>
            ) : null}
            <button type="submit" disabled={status === "loading"} style={Object.assign({}, primary, { opacity: status === "loading" ? 0.6 : 1 })}>
              {status === "loading" ? "Signing in..." : "Sign in"}
            </button>
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "#9ca3af" }}>Demo preview — set an API key for a gap-specific build.</div>
          </form>
        )}
      </div>
    </div>
  );
}
`;
}

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
