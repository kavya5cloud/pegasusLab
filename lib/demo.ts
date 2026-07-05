import type { Blueprint, Gap, Project, SiteFile, SitePlanFile } from "./types";

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

// ─── Demo website (full multi-file site, no API key needed) ──────────────────

export function demoSitePlan(): SitePlanFile[] {
  return [
    { path: "src/App.jsx", purpose: "Shared layout and routes for every page." },
    { path: "src/components/Nav.jsx", purpose: "Top navigation with links to every page." },
    { path: "src/components/StatCard.jsx", purpose: "Reusable KPI stat card." },
    { path: "src/pages/Home.jsx", purpose: "Landing page with hero, features and CTA." },
    { path: "src/pages/Dashboard.jsx", purpose: "Feedback table with search + status filter." },
    { path: "src/pages/Pricing.jsx", purpose: "Three pricing plans with a highlighted tier." },
    { path: "src/pages/Settings.jsx", purpose: "Profile form with validation + save state." },
    { path: "src/data/mock.js", purpose: "Named exports: feedback items, plans, features." },
    { path: "src/styles.css", purpose: "Global styles complementing Tailwind." },
  ];
}

export function demoSiteFiles(project: Project): SiteFile[] {
  const name = (project.name || "Your App").replace(/["\\]/g, "");
  return [
    {
      path: "src/App.jsx",
      code: [
        'import React from "react";',
        'import { Routes, Route } from "react-router-dom";',
        'import Nav from "./components/Nav.jsx";',
        'import Home from "./pages/Home.jsx";',
        'import Dashboard from "./pages/Dashboard.jsx";',
        'import Pricing from "./pages/Pricing.jsx";',
        'import Settings from "./pages/Settings.jsx";',
        "",
        "export default function App() {",
        "  return (",
        '    <div className="min-h-screen bg-slate-50">',
        "      <Nav />",
        '      <main className="max-w-6xl mx-auto px-6 py-10">',
        "        <Routes>",
        '          <Route path="/" element={<Home />} />',
        '          <Route path="/dashboard" element={<Dashboard />} />',
        '          <Route path="/pricing" element={<Pricing />} />',
        '          <Route path="/settings" element={<Settings />} />',
        "        </Routes>",
        "      </main>",
        "    </div>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "src/components/Nav.jsx",
      code: [
        'import React from "react";',
        'import { NavLink } from "react-router-dom";',
        "",
        "const links = [",
        '  { to: "/", label: "Home" },',
        '  { to: "/dashboard", label: "Dashboard" },',
        '  { to: "/pricing", label: "Pricing" },',
        '  { to: "/settings", label: "Settings" },',
        "];",
        "",
        "export default function Nav() {",
        "  return (",
        '    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">',
        '      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">',
        '        <span className="font-semibold tracking-tight text-indigo-600">' + name + "</span>",
        '        <nav className="flex gap-1">',
        "          {links.map((l) => (",
        "            <NavLink",
        "              key={l.to}",
        "              to={l.to}",
        "              className={({ isActive }) =>",
        '                "px-3 py-1.5 rounded-lg text-sm " +',
        '                (isActive ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-100")',
        "              }",
        "            >",
        "              {l.label}",
        "            </NavLink>",
        "          ))}",
        "        </nav>",
        "      </div>",
        "    </header>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "src/components/StatCard.jsx",
      code: [
        'import React from "react";',
        "",
        "export default function StatCard({ label, value, delta }) {",
        "  return (",
        '    <div className="bg-white rounded-2xl border border-slate-200 p-5">',
        '      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>',
        '      <p className="text-2xl font-semibold mt-1">{value}</p>',
        '      <p className="text-xs mt-1 text-emerald-600">{delta}</p>',
        "    </div>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "src/pages/Home.jsx",
      code: [
        'import React from "react";',
        'import { Link } from "react-router-dom";',
        'import { features } from "../data/mock.js";',
        "",
        "export default function Home() {",
        "  return (",
        "    <div>",
        '      <section className="text-center py-16">',
        '        <span className="inline-block text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 mb-6">Now in beta</span>',
        '        <h1 className="text-5xl font-bold tracking-tight text-slate-900">' + name + "</h1>",
        '        <p className="text-slate-600 mt-4 max-w-xl mx-auto">Collect feedback from every channel, cluster it into themes, and turn the top themes into roadmap items your team actually ships.</p>',
        '        <div className="mt-8 flex justify-center gap-3">',
        '          <Link to="/dashboard" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl px-6 py-3">Open dashboard</Link>',
        '          <Link to="/pricing" className="border border-slate-300 hover:border-slate-400 text-sm font-medium rounded-xl px-6 py-3">See pricing</Link>',
        "        </div>",
        "      </section>",
        '      <section className="grid md:grid-cols-3 gap-4 mt-6">',
        "        {features.map((f) => (",
        '          <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-6">',
        '            <div className="text-2xl">{f.icon}</div>',
        '            <h3 className="font-semibold mt-3">{f.title}</h3>',
        '            <p className="text-sm text-slate-600 mt-1">{f.body}</p>',
        "          </div>",
        "        ))}",
        "      </section>",
        "    </div>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "src/pages/Dashboard.jsx",
      code: [
        'import React, { useState } from "react";',
        'import StatCard from "../components/StatCard.jsx";',
        'import { feedback } from "../data/mock.js";',
        "",
        'const STATUSES = ["all", "new", "planned", "shipped"];',
        "",
        "export default function Dashboard() {",
        '  const [q, setQ] = useState("");',
        '  const [status, setStatus] = useState("all");',
        "  const rows = feedback.filter(function (f) {",
        '    const okStatus = status === "all" || f.status === status;',
        "    const okQ = f.title.toLowerCase().includes(q.toLowerCase());",
        "    return okStatus && okQ;",
        "  });",
        "  return (",
        "    <div>",
        '      <h1 className="text-2xl font-semibold">Dashboard</h1>',
        '      <div className="grid md:grid-cols-3 gap-4 mt-6">',
        '        <StatCard label="Open feedback" value="128" delta="+12 this week" />',
        '        <StatCard label="Themes" value="9" delta="+2 this week" />',
        '        <StatCard label="Shipped from feedback" value="23" delta="+4 this month" />',
        "      </div>",
        '      <div className="mt-8 flex flex-wrap items-center gap-3">',
        '        <input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder="Search feedback" className="border border-slate-300 rounded-xl px-4 py-2 text-sm w-64 outline-none focus:border-indigo-500" />',
        "        {STATUSES.map(function (s) {",
        "          return (",
        '            <button key={s} onClick={function () { setStatus(s); }} className={"px-3 py-1.5 rounded-lg text-xs capitalize " + (status === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600")}>{s}</button>',
        "          );",
        "        })}",
        "      </div>",
        '      <div className="mt-4 bg-white rounded-2xl border border-slate-200 overflow-hidden">',
        '        <table className="w-full text-sm">',
        '          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">',
        '            <tr><th className="px-5 py-3">Title</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Votes</th><th className="px-5 py-3">Status</th></tr>',
        "          </thead>",
        "          <tbody>",
        "            {rows.map(function (f) {",
        "              return (",
        '                <tr key={f.id} className="border-t border-slate-100">',
        '                  <td className="px-5 py-3 font-medium">{f.title}</td>',
        '                  <td className="px-5 py-3 text-slate-500">{f.source}</td>',
        '                  <td className="px-5 py-3">{f.votes}</td>',
        '                  <td className="px-5 py-3"><span className={"text-xs rounded-full px-2 py-0.5 capitalize " + (f.status === "shipped" ? "bg-emerald-50 text-emerald-700" : f.status === "planned" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600")}>{f.status}</span></td>',
        "                </tr>",
        "              );",
        "            })}",
        '            {rows.length === 0 && (<tr><td colSpan="4" className="px-5 py-8 text-center text-slate-400">No feedback matches.</td></tr>)}',
        "          </tbody>",
        "        </table>",
        "      </div>",
        "    </div>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "src/pages/Pricing.jsx",
      code: [
        'import React from "react";',
        'import { plans } from "../data/mock.js";',
        "",
        "export default function Pricing() {",
        "  return (",
        "    <div>",
        '      <h1 className="text-2xl font-semibold text-center">Pricing</h1>',
        '      <p className="text-slate-600 text-sm text-center mt-2">Start free, upgrade when your team does.</p>',
        '      <div className="grid md:grid-cols-3 gap-4 mt-10">',
        "        {plans.map(function (p) {",
        "          return (",
        '            <div key={p.name} className={"rounded-2xl border p-6 bg-white " + (p.highlight ? "border-indigo-500 shadow-lg" : "border-slate-200")}>',
        '              <h3 className="font-semibold">{p.name}</h3>',
        '              <p className="text-3xl font-bold mt-2">{p.price}<span className="text-sm font-normal text-slate-500">{p.period}</span></p>',
        '              <ul className="mt-4 space-y-2 text-sm text-slate-600">',
        "                {p.features.map(function (f) {",
        '                  return <li key={f} className="flex gap-2"><span className="text-indigo-600">✓</span>{f}</li>;',
        "                })}",
        "              </ul>",
        '              <button className={"w-full mt-6 rounded-xl py-2.5 text-sm font-medium " + (p.highlight ? "bg-indigo-600 text-white hover:bg-indigo-500" : "border border-slate-300 hover:border-slate-400")}>{p.cta}</button>',
        "            </div>",
        "          );",
        "        })}",
        "      </div>",
        "    </div>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "src/pages/Settings.jsx",
      code: [
        'import React, { useState } from "react";',
        "",
        "export default function Settings() {",
        '  const [name, setName] = useState("Ada Lovelace");',
        '  const [email, setEmail] = useState("ada@example.com");',
        "  const [saved, setSaved] = useState(false);",
        "  function submit(e) {",
        "    e.preventDefault();",
        "    setSaved(true);",
        "    setTimeout(function () { setSaved(false); }, 1800);",
        "  }",
        '  const valid = name.trim() && email.includes("@");',
        "  return (",
        '    <div className="max-w-lg">',
        '      <h1 className="text-2xl font-semibold">Settings</h1>',
        '      <form onSubmit={submit} className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">',
        "        <div>",
        '          <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>',
        '          <input value={name} onChange={function (e) { setName(e.target.value); }} className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500" />',
        "        </div>",
        "        <div>",
        '          <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>',
        '          <input value={email} onChange={function (e) { setEmail(e.target.value); }} className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500" />',
        "        </div>",
        '        {!valid && <p className="text-xs text-rose-600">Enter a name and a valid email.</p>}',
        '        <button disabled={!valid} className="bg-slate-900 text-white text-sm font-medium rounded-xl px-5 py-2.5 disabled:opacity-40">Save changes</button>',
        '        {saved && <span className="ml-3 text-sm text-emerald-600">Saved ✓</span>}',
        "      </form>",
        "    </div>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "src/data/mock.js",
      code: [
        "export const features = [",
        '  { icon: "📥", title: "Every channel", body: "Email, Slack and in-app feedback land in one inbox automatically." },',
        '  { icon: "🧠", title: "Auto-clustering", body: "Similar requests group into themes so you see what actually matters." },',
        '  { icon: "🗺️", title: "Roadmap sync", body: "Promote a theme to a roadmap item and close the loop with voters." },',
        "];",
        "",
        "export const feedback = [",
        '  { id: 1, title: "Dark mode for the dashboard", source: "In-app", votes: 42, status: "planned" },',
        '  { id: 2, title: "Slack thread sync", source: "Slack", votes: 38, status: "new" },',
        '  { id: 3, title: "CSV export of themes", source: "Email", votes: 27, status: "shipped" },',
        '  { id: 4, title: "SSO with Okta", source: "Email", votes: 24, status: "planned" },',
        '  { id: 5, title: "Weekly digest email", source: "In-app", votes: 19, status: "new" },',
        '  { id: 6, title: "Public roadmap page", source: "Slack", votes: 15, status: "shipped" },',
        "];",
        "",
        "export const plans = [",
        '  { name: "Starter", price: "$0", period: "/mo", cta: "Start free", highlight: false, features: ["100 feedback items", "1 workspace", "Community support"] },',
        '  { name: "Team", price: "$29", period: "/mo", cta: "Start trial", highlight: true, features: ["Unlimited feedback", "Auto-clustering", "Roadmap sync", "Priority support"] },',
        '  { name: "Scale", price: "$99", period: "/mo", cta: "Talk to us", highlight: false, features: ["Everything in Team", "SSO / SAML", "Audit log", "SLA"] },',
        "];",
      ].join("\n"),
    },
    {
      path: "src/styles.css",
      code: "html { scroll-behavior: smooth; }\nbody { -webkit-font-smoothing: antialiased; }\n",
    },
  ];
}
