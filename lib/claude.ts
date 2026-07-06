import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { Blueprint, Gap, Project, SitePlanFile, TaskType } from "./types";

// ─── Backend selection ────────────────────────────────────────────────────────

type Backend = "anthropic" | "gemini" | "groq" | "ollama" | "demo";

function getBackend(): Backend {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) return "ollama";
  return "demo";
}

export function isDemoMode(): boolean {
  return getBackend() === "demo";
}

export function getBackendLabel(): string {
  const b = getBackend();
  if (b === "anthropic") return `Anthropic`;
  if (b === "gemini") return `Google Gemini (${geminiModel()})`;
  if (b === "groq") return `Groq (${process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"})`;
  if (b === "ollama") return `Ollama (${process.env.OLLAMA_MODEL ?? "llama3.1"})`;
  return "demo";
}

// ─── Intelligence Routing ─────────────────────────────────────────────────────
//
// Pegasus automatically selects the best model for each cognitive task.
// Users never need to choose a model — the router handles it.

const ANTHROPIC_MODELS: Record<TaskType, string> = {
  understand:        "claude-opus-4-8",   // deepest context parsing
  architecture:      "claude-opus-4-8",   // complex system design
  "design-analysis": "claude-opus-4-8",   // vision + reasoning
  codegen:           "claude-sonnet-4-6", // fast, high-quality code
  validate:          "claude-sonnet-4-6", // blueprint cross-check
  chat:              "claude-sonnet-4-6", // conversational
  testing:           "claude-haiku-4-5-20251001", // test stub generation
  docs:              "claude-haiku-4-5-20251001", // documentation
};

/** Returns the model id routed for the given task, falling back to env override. */
function routeModel(task: TaskType): string {
  const override = process.env.ANTHROPIC_MODEL;
  if (override) return override;
  return ANTHROPIC_MODELS[task];
}

/** Human-readable label showing which model handles each task type. */
export function getRoutingTable(): Record<TaskType, string> {
  return { ...ANTHROPIC_MODELS };
}

// ─── Clients ──────────────────────────────────────────────────────────────────

function geminiModel(): string {
  const m = process.env.GEMINI_MODEL;
  // gemini-2.0-flash free tier was retired (429 with limit:0 on every
  // metric). Never use it, even when the env still says so — a stale env
  // var must not be able to kill the whole Gemini pool.
  if (!m || m === "gemini-2.0-flash") return "gemini-2.5-flash";
  return m;
}

// ─── Rate-limit handling ─────────────────────────────────────────────────────

function isRateLimit(err: unknown): boolean {
  const s = err instanceof Error ? err.message : String(err);
  return s.includes("RESOURCE_EXHAUSTED") || s.includes("429") || /quota/i.test(s);
}

/** Parse the provider's suggested retry delay (e.g. "39.7s") from a 429. */
function retryDelayMs(err: unknown): number {
  const s = err instanceof Error ? err.message : String(err);
  const m = s.match(/retry(?:Delay)?[^0-9]*([0-9.]+)s/i);
  const secs = m ? Math.ceil(parseFloat(m[1])) : 15;
  // Short cap: long sleeps risk the serverless function limit killing the
  // request mid-wait. Longer pacing belongs on the client (it has a visible
  // countdown and no timeout).
  return Math.min(secs, 20) * 1000;
}

/** Turn provider errors into something a user can act on. */
export function friendlyAIError(err: unknown): { message: string; status: number } {
  if (isRateLimit(err)) {
    return {
      message:
        "The AI provider is at capacity right now (rate limit). Wait a minute and try again — your work is saved.",
      status: 429,
    };
  }
  return {
    message: err instanceof Error ? err.message : "AI request failed",
    status: 500,
  };
}

type OllamaOpts = { url?: string; model?: string };

function openaiClient(ollama?: OllamaOpts): OpenAI {
  if (ollama?.url) {
    return new OpenAI({ apiKey: "ollama", baseURL: ollama.url });
  }
  if (process.env.GROQ_API_KEY) {
    return new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  }
  return new OpenAI({ apiKey: "ollama", baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1" });
}

function openaiModel(ollama?: OllamaOpts): string {
  if (ollama?.model) return ollama.model;
  if (process.env.GROQ_API_KEY) return process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  return process.env.OLLAMA_MODEL ?? "llama3.1";
}

/** True when a second free pool exists to absorb rate-limited requests. */
function hasGroqFallback(backend: Backend): boolean {
  return backend !== "groq" && !!process.env.GROQ_API_KEY;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const NodeTypeSchema = z.enum(["page", "component", "api", "service", "database", "external", "design", "doc"]);
const StatusSchema = z.enum(["existing", "partial", "missing"]);

const PrdSchema = z.object({
  vision: z.string(),
  problemStatement: z.string(),
  targetUsers: z.array(z.string()),
  coreFeatures: z.array(z.object({
    name: z.string(),
    description: z.string(),
    priority: z.enum(["must-have", "should-have", "nice-to-have"]),
  })),
  nonGoals: z.array(z.string()),
  successMetrics: z.array(z.string()),
}).optional();

const UserFlowSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  actor: z.string(),
  steps: z.array(z.string()),
  outcome: z.string(),
})).optional();

const DatabaseSchemaZ = z.object({
  engine: z.string(),
  entities: z.array(z.object({
    name: z.string(),
    fields: z.array(z.object({ name: z.string(), type: z.string(), constraints: z.string() })),
  })),
  relationships: z.array(z.object({
    from: z.string(), to: z.string(),
    type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
    via: z.string().optional(),
  })),
}).optional();

const ApiArchitectureZ = z.object({
  style: z.enum(["REST", "GraphQL", "gRPC", "tRPC"]),
  authStrategy: z.string(),
  endpoints: z.array(z.object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z.string(),
    description: z.string(),
    auth: z.boolean(),
  })),
  rateLimitingNotes: z.string(),
}).optional();

const FrontendArchitectureZ = z.object({
  framework: z.string(),
  stateManagement: z.string(),
  routing: z.string(),
  designSystem: z.string(),
  keyComponents: z.array(z.string()),
}).optional();

const BackendArchitectureZ = z.object({
  pattern: z.enum(["monolith", "microservices", "serverless", "hybrid"]),
  services: z.array(z.object({ name: z.string(), responsibility: z.string(), tech: z.string() })),
  scalingNotes: z.string(),
}).optional();

const InfrastructurePlanZ = z.object({
  provider: z.string(),
  services: z.array(z.object({ name: z.string(), purpose: z.string() })),
  estimatedMonthlyCost: z.string(),
  scalingApproach: z.string(),
}).optional();

const CicdPipelineZ = z.object({
  provider: z.string(),
  stages: z.array(z.string()),
  deploymentStrategy: z.string(),
  environments: z.array(z.string()),
}).optional();

const TestingStrategyZ = z.object({
  unit: z.string(),
  integrationScenarios: z.array(z.string()),
  e2eScenarios: z.array(z.string()),
  performanceTargets: z.string(),
}).optional();

const DeploymentPlanZ = z.object({
  environments: z.array(z.object({ name: z.string(), config: z.string() })),
  rolloutStrategy: z.string(),
  monitoring: z.string(),
  rollbackPlan: z.string(),
}).optional();

const ProjectMemoryZ = z.object({
  corePurpose: z.string(),
  targetUsers: z.array(z.string()),
  keyConstraints: z.array(z.string()),
  technicalDecisions: z.array(z.object({
    topic: z.string(),
    decision: z.string(),
    rationale: z.string(),
  })),
  openQuestions: z.array(z.string()),
}).optional();

const ContextGraphZ = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(["requirement", "design", "api", "database", "userflow", "code", "component", "service"]),
    label: z.string(),
    sourceId: z.string().optional(),
  })),
  links: z.array(z.object({
    from: z.string(),
    to: z.string(),
    relation: z.string(),
  })),
}).optional();

const BlueprintSchema = z.object({
  // Core graph
  summary: z.string(),
  techStack: z.array(z.string()),
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: NodeTypeSchema,
    status: StatusSchema,
    description: z.string(),
    tech: z.string().nullable(),
  })),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    label: z.string().nullable(),
    status: StatusSchema,
  })),
  gaps: z.array(z.object({
    title: z.string(),
    severity: z.enum(["critical", "high", "medium", "low"]),
    category: z.enum(["missing-feature", "integration", "architecture", "security", "data", "ux"]),
    description: z.string(),
    recommendation: z.string(),
    relatedNodeIds: z.array(z.string()),
  })),

  // Product Blueprint sections
  prd: PrdSchema,
  userFlows: UserFlowSchema,
  databaseSchema: DatabaseSchemaZ,
  apiArchitecture: ApiArchitectureZ,
  frontendArchitecture: FrontendArchitectureZ,
  backendArchitecture: BackendArchitectureZ,
  infrastructurePlan: InfrastructurePlanZ,
  cicdPipeline: CicdPipelineZ,
  testingStrategy: TestingStrategyZ,
  deploymentPlan: DeploymentPlanZ,

  // Project Memory + Context Graph
  memory: ProjectMemoryZ,
  contextGraph: ContextGraphZ,
});

// ─── System prompts ────────────────────────────────────────────────────────────

const BLUEPRINT_SYSTEM = `You are Pegasus AI — a context orchestration engine that transforms everything a developer knows about their application into a complete, living Product Blueprint before a single line of code is written.

You accept any combination of inputs: screenshots, inspiration images, Figma files, GitHub repositories, documents, voice notes, requirements, API specs, database schemas, and AI conversations. You understand intent across all of them and synthesise a single source of truth.

Your output is a complete Product Blueprint with these sections:

**Core architectural graph:**
- nodes: every meaningful piece of the application — pages, UI components, API endpoints, backend services, database tables, external integrations, design artifacts, and docs. Status: "existing" (in materials), "partial" (mentioned/half-built), "missing" (required but absent).
- edges: how pieces connect (data flow, calls, renders, reads/writes). Missing edges show what still needs wiring.
- gaps: concrete, actionable findings — missing features, broken integrations, architecture risks, security holes, data-model problems, UX holes. Each references node ids and gives a specific recommendation.

**Product Blueprint sections (produce all of these):**
- prd: Product Requirements Document — vision, problem statement, target users, core features with priority (must-have/should-have/nice-to-have), non-goals, success metrics.
- userFlows: 3-6 key user journeys with actor, sequential steps, and outcome.
- databaseSchema: engine choice with rationale, all entities with typed fields and constraints, relationships.
- apiArchitecture: style (REST/GraphQL/gRPC/tRPC), auth strategy, all endpoints with method/path/description/auth flag, rate-limiting notes.
- frontendArchitecture: framework, state management, routing approach, design system, key components list.
- backendArchitecture: pattern (monolith/microservices/serverless/hybrid), services with responsibilities, scaling notes.
- infrastructurePlan: cloud provider, services required, estimated monthly cost range, scaling approach.
- cicdPipeline: CI/CD provider, pipeline stages, deployment strategy, environments.
- testingStrategy: unit test scope, integration test scenarios, e2e scenarios, performance targets.
- deploymentPlan: environments with config, rollout strategy, monitoring setup, rollback plan.

**Project Memory:**
- memory: core purpose, target users, key constraints, important technical decisions with rationale, open questions.

**Context Graph:**
- contextGraph: nodes for requirements/designs/APIs/DB entities/user flows/code, with typed links (implements, reads-from, calls, validates, etc.) connecting everything.

Rules:
- Node ids are short kebab-case slugs, unique across the blueprint.
- Edge source/target must reference node ids in nodes.
- Be concrete: 12-30 nodes, 4-10 gaps, 3-6 user flows, all DB entities, all API endpoints.
- Infer industry-standard pieces (auth, billing, observability) when clearly needed — mark them missing.
- The blueprint is the single source of truth. Every implementation decision must trace back to it.
- Think like a senior full-stack engineer who has absorbed the entire whiteboard.`;

const BLUEPRINT_JSON_SUFFIX = `

Respond with a single valid JSON object (no markdown, no code fences) exactly matching this structure. Omit optional sections you cannot reliably infer rather than guessing:
{
  "summary": "string",
  "techStack": ["string"],
  "nodes": [{"id":"slug","label":"string","type":"page|component|api|service|database|external|design|doc","status":"existing|partial|missing","description":"string","tech":"string|null"}],
  "edges": [{"source":"node-id","target":"node-id","label":"string|null","status":"existing|partial|missing"}],
  "gaps": [{"title":"string","severity":"critical|high|medium|low","category":"missing-feature|integration|architecture|security|data|ux","description":"string","recommendation":"string","relatedNodeIds":["node-id"]}],
  "prd": {"vision":"string","problemStatement":"string","targetUsers":["string"],"coreFeatures":[{"name":"string","description":"string","priority":"must-have|should-have|nice-to-have"}],"nonGoals":["string"],"successMetrics":["string"]},
  "userFlows": [{"id":"string","name":"string","actor":"string","steps":["string"],"outcome":"string"}],
  "databaseSchema": {"engine":"string","entities":[{"name":"string","fields":[{"name":"string","type":"string","constraints":"string"}]}],"relationships":[{"from":"string","to":"string","type":"one-to-one|one-to-many|many-to-many","via":"string"}]},
  "apiArchitecture": {"style":"REST|GraphQL|gRPC|tRPC","authStrategy":"string","endpoints":[{"method":"GET|POST|PUT|PATCH|DELETE","path":"string","description":"string","auth":true}],"rateLimitingNotes":"string"},
  "frontendArchitecture": {"framework":"string","stateManagement":"string","routing":"string","designSystem":"string","keyComponents":["string"]},
  "backendArchitecture": {"pattern":"monolith|microservices|serverless|hybrid","services":[{"name":"string","responsibility":"string","tech":"string"}],"scalingNotes":"string"},
  "infrastructurePlan": {"provider":"string","services":[{"name":"string","purpose":"string"}],"estimatedMonthlyCost":"string","scalingApproach":"string"},
  "cicdPipeline": {"provider":"string","stages":["string"],"deploymentStrategy":"string","environments":["string"]},
  "testingStrategy": {"unit":"string","integrationScenarios":["string"],"e2eScenarios":["string"],"performanceTargets":"string"},
  "deploymentPlan": {"environments":[{"name":"string","config":"string"}],"rolloutStrategy":"string","monitoring":"string","rollbackPlan":"string"},
  "memory": {"corePurpose":"string","targetUsers":["string"],"keyConstraints":["string"],"technicalDecisions":[{"topic":"string","decision":"string","rationale":"string"}],"openQuestions":["string"]},
  "contextGraph": {"nodes":[{"id":"string","type":"requirement|design|api|database|userflow|code|component|service","label":"string"}],"links":[{"from":"string","to":"string","relation":"string"}]}
}`;

const CODEGEN_SYSTEM = `You are the code generation engine of Pegasus AI — a context orchestration system that validates every implementation against the Product Blueprint before writing a line of code.

You receive:
1. A complete Product Blueprint (the single source of truth)
2. The specific gap to close
3. Relevant whiteboard materials

Before generating code, you internally validate:
- Does this gap exist in the blueprint? (it must)
- Does the implementation satisfy the PRD requirements?
- Is it consistent with the database schema and API architecture?
- Does it follow the frontend/backend architecture decisions?

Output format:
1. **Blueprint validation** (one short paragraph): which blueprint sections this implementation satisfies.
2. **Implementation** (each file as \`### path/to/file.ext\` heading + fenced code block).
3. **Wiring it up** (short section): installs, env vars, and touchpoints in existing files.

Write real, runnable, production-quality code. No placeholders. Match the tech stack in the blueprint.`;

const PREVIEW_SYSTEM = `You generate a SINGLE self-contained React component file (App.jsx) that visually demonstrates the solution to ONE specific gap in a web application, so a stakeholder can SEE and INTERACT with it in a live preview.

HARD CONSTRAINTS — the file must run in a bare Vite + React sandbox with zero errors:
- Output ONLY the raw contents of App.jsx. No markdown code fences, no prose, no explanation before or after.
- Import ONLY from "react" (e.g. import React, { useState } from "react"). No other packages, no CSS-file imports, no network/fetch calls.
- Default-export a component named App.
- Plain JavaScript + JSX only — no TypeScript types or annotations.
- All styling via inline style objects or a single <style> tag you render. Make it look modern, polished, and on-brand.
- Mock any data, state, or API responses inline with realistic sample values.
- Build a focused, INTERACTIVE demo of the gap's solution — not the whole app. (Auth gap → a working sign-in form with validation + success states; pagination gap → a paginated table with sample rows and working page controls; billing gap → a pricing/checkout mock with selectable plans.)

The component must render immediately and be visually impressive.`;

const SITE_PLAN_SYSTEM = `You are the build planner inside Pegasus Lab. Given a Product Blueprint, produce the file manifest for a complete multi-page React website that implements it.

The site runs in a FIXED Vite + React scaffold that already provides: package.json (react, react-dom, react-router-dom), vite config, index.html (with the Tailwind CDN loaded), and src/main.jsx (renders <App /> inside <BrowserRouter> and imports ./styles.css). You plan ONLY the src/ files.

Output STRICT JSON, nothing else: {"files": [{"path": "...", "purpose": "..."}]}

Rules:
- 8 to 14 files, all under src/.
- MUST include: "src/App.jsx" (defines the <Routes> for every page and shared layout), "src/components/Nav.jsx", "src/data/mock.js" (all mock data for the site), "src/styles.css".
- One file per page under src/pages/ (e.g. "src/pages/Home.jsx") — derive the pages from the blueprint's page nodes and user flows. Always include a landing/home page.
- Reusable UI under src/components/.
- Use .jsx extension for all component files.
- Each "purpose" is one specific sentence: what the file renders, its main sections, and which mock data it uses.`;

const SITE_FILE_SYSTEM = `You are the code generator inside Pegasus Lab. You write ONE file of a multi-page React website. Other files are generated separately from the same manifest, so stay strictly consistent with it.

HARD CONSTRAINTS — the file must run in a Vite + React sandbox with zero errors:
- Output ONLY the raw file contents. No markdown fences, no prose.
- Plain JavaScript + JSX. No TypeScript.
- Imports allowed ONLY from: "react", "react-router-dom", or other files in the manifest via relative paths WITH extension (e.g. import Nav from "../components/Nav.jsx"; import { products } from "../data/mock.js").
- Never import a file that is not in the manifest. Never import CSS (main.jsx already loads styles.css).
- Components are default exports. Named exports only in src/data/mock.js.
- src/App.jsx: import every page from the manifest, render the shared layout (Nav etc.) and a <Routes> block with a <Route> for each page. Do NOT render <BrowserRouter> — main.jsx already provides it.
- Navigation uses <Link>/<NavLink> from react-router-dom, never <a href>.
- Style with Tailwind utility classes (the CDN is loaded). Aim for a polished, modern, cohesive design: real spacing, hover states, a consistent accent color.
- No fetch/network calls, no localStorage. All data comes from src/data/mock.js with realistic, domain-specific sample values.
- For images use https://picsum.photos/seed/<word>/<w>/<h> URLs or pure CSS blocks.
- Interactive where it matters: working forms with validation states, filters, tabs, modals — using React state only.`;

const CHAT_SYSTEM = `You are Pegasus, the build intelligence inside pegasus lab. You orchestrate context — not just generate code.

You have the full Product Blueprint: PRD, user flows, database schema, API architecture, frontend and backend architecture, infrastructure plan, CI/CD, testing strategy, and deployment plan. This is the single source of truth.

When the user asks questions, answer by referencing the blueprint. When they want to build something, validate it against the blueprint first. When they want to change direction, update the blueprint first, then implement.

Be concrete and concise. Reference blueprint sections by name. When showing code, write real code.`;

// ─── Input → text ─────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  idea: "Idea / requirement",
  code: "Code snippet",
  github: "GitHub repository",
  figma: "Figma design file",
  image: "Screenshot / inspiration image",
  doc: "Document / specification",
  voice: "Voice note",
  requirement: "Formal requirement",
  api: "API specification",
  database: "Database schema / ERD",
  conversation: "AI conversation export",
};

function boardToText(project: Project, githubContext: Record<string, string> = {}): string {
  const parts: string[] = [
    `# Project: ${project.name}`,
    project.description ? `## Description\n${project.description}` : "",
  ];
  for (const item of project.items) {
    if (item.kind === "image") continue;
    const label = KIND_LABEL[item.kind] ?? item.kind;
    if (item.kind === "github") {
      const ctx = githubContext[item.id];
      parts.push(`## Context input: ${label} — "${item.title}"\nURL: ${item.content}\n${ctx ? `Fetched content:\n${ctx}` : ""}`);
      continue;
    }
    const content = item.content.length > 60_000 ? item.content.slice(0, 60_000) + "\n...[truncated]" : item.content;
    parts.push(`## Context input: ${label} — "${item.title}"\n${content}`);
  }
  parts.push("Analyse every context input above and produce the complete Product Blueprint as structured output.");
  return parts.filter(Boolean).join("\n\n");
}

// ─── Blueprint generation ─────────────────────────────────────────────────────

export type OverrideKeys = {
  anthropic?: string;
  google?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
};

function resolveBackend(keys: OverrideKeys): Backend {
  if (keys.anthropic) return "anthropic";
  if (keys.google) return "gemini";
  if (keys.ollamaUrl || keys.ollamaModel) return "ollama";
  return getBackend();
}

export async function generateBlueprint(
  project: Project,
  githubContext: Record<string, string> = {},
  keys: OverrideKeys = {}
): Promise<Blueprint> {
  const backend = resolveBackend(keys);
  try {
    if (backend === "anthropic") return await generateBlueprintAnthropic(project, githubContext, keys.anthropic);
    if (backend === "gemini") return await generateBlueprintGemini(project, githubContext, keys.google);
    return await generateBlueprintOpenAI(project, githubContext, { url: keys.ollamaUrl, model: keys.ollamaModel });
  } catch (err) {
    // Rate limited with a Groq free pool configured → generate there instead.
    if (isRateLimit(err) && hasGroqFallback(backend)) {
      console.warn("[ai] blueprint rate limited — failing over to Groq");
      return generateBlueprintOpenAI(project, githubContext);
    }
    throw err;
  }
}

function anthropicClient(apiKey?: string) {
  return new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY ?? "demo" });
}

function geminiClient(apiKey?: string) {
  return new GoogleGenAI({ apiKey: apiKey ?? process.env.GOOGLE_API_KEY ?? "demo" });
}

async function generateBlueprintAnthropic(
  project: Project,
  githubContext: Record<string, string>,
  apiKey?: string
): Promise<Blueprint> {
  type ContentParam = Anthropic.ContentBlockParam[];
  const textParts: string[] = [
    `# Project: ${project.name}`,
    project.description ? `## Description\n${project.description}` : "",
  ];
  const imageBlocks: ContentParam = [];

  for (const item of project.items) {
    const label = KIND_LABEL[item.kind] ?? item.kind;
    if (item.kind === "image" && item.dataUrl) {
      const match = item.dataUrl.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/);
      if (match && match[2].length < 5_000_000) {
        textParts.push(`## Context input: ${label} — "${item.title}"\n${item.content || "(see attached image)"}\nThe image is attached below.`);
        imageBlocks.push({ type: "image", source: { type: "base64", media_type: match[1] as "image/png" | "image/jpeg" | "image/gif" | "image/webp", data: match[2] } });
        imageBlocks.push({ type: "text", text: `(Image above: "${item.title}")` });
      }
      continue;
    }
    if (item.kind === "github") {
      const ctx = githubContext[item.id];
      textParts.push(`## Context input: ${label} — "${item.title}"\nURL: ${item.content}\n${ctx ? `Fetched content:\n${ctx}` : ""}`);
      continue;
    }
    const content = item.content.length > 60_000 ? item.content.slice(0, 60_000) + "\n...[truncated]" : item.content;
    textParts.push(`## Context input: ${label} — "${item.title}"\n${content}`);
  }
  textParts.push("Analyse every context input above and produce the complete Product Blueprint as structured output.");

  const userContent: ContentParam = [
    { type: "text", text: textParts.filter(Boolean).join("\n\n") },
    ...imageBlocks,
  ];

  // Intelligence routing: blueprint generation → "architecture" task → Opus
  const model = routeModel("architecture");
  const client = anthropicClient(apiKey);

  const response = await client.messages.parse({
    model,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: BLUEPRINT_SYSTEM,
    messages: [{ role: "user", content: userContent }],
    output_config: { format: zodOutputFormat(BlueprintSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Blueprint generation returned no parseable output");
  return finishBlueprint(parsed);
}

async function generateBlueprintOpenAI(
  project: Project,
  githubContext: Record<string, string>,
  ollama?: OllamaOpts
): Promise<Blueprint> {
  const client = openaiClient(ollama);
  const model = openaiModel(ollama);
  const text = boardToText(project, githubContext);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: BLUEPRINT_SYSTEM + BLUEPRINT_JSON_SUFFIX },
      { role: "user", content: text },
    ],
    max_tokens: 8000,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = BlueprintSchema.parse(JSON.parse(raw));
  return finishBlueprint(parsed);
}

async function generateBlueprintGemini(
  project: Project,
  githubContext: Record<string, string>,
  apiKey?: string
): Promise<Blueprint> {
  const text = boardToText(project, githubContext);
  const prompt = `${BLUEPRINT_SYSTEM}${BLUEPRINT_JSON_SUFFIX}\n\n${text}`;
  const client = geminiClient(apiKey);

  const response = await client.models.generateContent({
    model: geminiModel(),
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const raw = response.text ?? "{}";
  const parsed = BlueprintSchema.parse(JSON.parse(raw));
  return finishBlueprint(parsed);
}

function finishBlueprint(parsed: z.infer<typeof BlueprintSchema>): Blueprint {
  const nodeIds = new Set(parsed.nodes.map((n) => n.id));
  return {
    // Core graph
    summary: parsed.summary,
    techStack: parsed.techStack,
    nodes: parsed.nodes.map((n) => ({ ...n, tech: n.tech ?? undefined })),
    edges: parsed.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e, i) => ({ id: `e${i}`, source: e.source, target: e.target, label: e.label ?? undefined, status: e.status })),
    gaps: parsed.gaps.map((g, i) => ({
      ...g,
      id: `gap-${i}`,
      relatedNodeIds: g.relatedNodeIds.filter((id) => nodeIds.has(id)),
    })),

    // Product Blueprint sections
    prd: parsed.prd,
    userFlows: parsed.userFlows,
    databaseSchema: parsed.databaseSchema,
    apiArchitecture: parsed.apiArchitecture,
    frontendArchitecture: parsed.frontendArchitecture,
    backendArchitecture: parsed.backendArchitecture,
    infrastructurePlan: parsed.infrastructurePlan,
    cicdPipeline: parsed.cicdPipeline,
    testingStrategy: parsed.testingStrategy,
    deploymentPlan: parsed.deploymentPlan,

    // Memory + Context Graph
    memory: parsed.memory,
    contextGraph: parsed.contextGraph,
  };
}

// ─── Blueprint validation ─────────────────────────────────────────────────────

/** Validates that a gap exists in the blueprint and is safe to implement. */
export async function validateGapAgainstBlueprint(
  project: Project,
  gap: Gap
): Promise<{ valid: boolean; notes: string }> {
  const bp = project.blueprint;
  if (!bp) return { valid: false, notes: "No blueprint to validate against." };

  // Check the gap is known to the blueprint
  const knownGap = bp.gaps.find((g) => g.id === gap.id);
  if (!knownGap) return { valid: false, notes: "Gap not found in current blueprint." };

  // All related nodes must exist
  const nodeIds = new Set(bp.nodes.map((n) => n.id));
  const missingNodes = gap.relatedNodeIds.filter((id) => !nodeIds.has(id));
  if (missingNodes.length > 0) {
    return { valid: false, notes: `Related nodes missing from blueprint: ${missingNodes.join(", ")}` };
  }

  return { valid: true, notes: "Gap validated against Product Blueprint." };
}

// ─── Code generation ──────────────────────────────────────────────────────────

export function streamGapCode(project: Project, gap: Gap, keys: OverrideKeys = {}): AsyncIterable<string> {
  const backend = resolveBackend(keys);
  const ollamaOpts: OllamaOpts = { url: keys.ollamaUrl, model: keys.ollamaModel };
  const bp = project.blueprint;

  const blueprintContext = bp ? {
    summary: bp.summary,
    techStack: bp.techStack,
    nodes: bp.nodes,
    edges: bp.edges,
    prd: bp.prd,
    databaseSchema: bp.databaseSchema,
    apiArchitecture: bp.apiArchitecture,
    frontendArchitecture: bp.frontendArchitecture,
    backendArchitecture: bp.backendArchitecture,
  } : null;

  const boardExcerpts = project.items
    .filter((i) => i.kind !== "image")
    .map((i) => `## ${i.title} (${i.kind})\n\`\`\`\n${i.content.slice(0, 20_000)}\n\`\`\``)
    .join("\n\n");

  const userMessage = [
    `# Product Blueprint (single source of truth)\n${JSON.stringify(blueprintContext, null, 2)}`,
    boardExcerpts ? `# Context inputs\n${boardExcerpts}` : "",
    `# Gap to close (blueprint-validated)\n${JSON.stringify(gap, null, 2)}`,
    "Validate this gap against the blueprint, then generate the code that closes it.",
  ].filter(Boolean).join("\n\n");

  if (backend === "anthropic") {
    return anthropicTextStream(
      anthropicClient(keys.anthropic).messages.stream({
        model: routeModel("codegen"),
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        system: CODEGEN_SYSTEM,
        messages: [{ role: "user", content: userMessage }],
      })
    );
  }

  if (backend === "gemini") {
    return streamWithFallback(
      geminiTextStream(`${CODEGEN_SYSTEM}\n\n${userMessage}`, keys.google),
      hasGroqFallback(backend)
        ? () => groqStream(CODEGEN_SYSTEM, [{ role: "user", content: userMessage }], 16000)
        : null
    );
  }

  return openaiTextStream(
    openaiClient(ollamaOpts).chat.completions.stream({
      model: openaiModel(ollamaOpts),
      max_tokens: 16000,
      stream: true,
      messages: [
        { role: "system", content: CODEGEN_SYSTEM },
        { role: "user", content: userMessage },
      ],
    })
  );
}

// ─── Live preview (self-contained App.jsx) ───────────────────────────────────

function stripCodeFences(s: string): string {
  const t = s.trim();
  const fenced = t.match(/^```[a-zA-Z]*\n([\s\S]*?)```\s*$/);
  return (fenced ? fenced[1] : t).trim();
}

/**
 * Generates a single self-contained App.jsx that visually demonstrates the
 * solution to a gap, runnable as-is in a bare Vite + React sandbox.
 */
export async function generatePreviewApp(
  project: Project,
  gap: Gap,
  keys: OverrideKeys = {}
): Promise<string> {
  const bp = project.blueprint;

  const context = {
    appName: project.name,
    techStack: bp?.techStack,
    designSystem: bp?.frontendArchitecture?.designSystem,
    gap: {
      title: gap.title,
      description: gap.description,
      recommendation: gap.recommendation,
      category: gap.category,
    },
  };
  const userMessage = `Generate the App.jsx that demonstrates the solution to this gap.\n\n${JSON.stringify(context, null, 2)}`;

  const raw = await completeText(PREVIEW_SYSTEM, userMessage, keys, 8000);
  return stripCodeFences(raw);
}

// ─── Website generation (full multi-file site) ───────────────────────────────

/**
 * One-shot text completion across whichever backend is active.
 * On a provider rate limit: fail over to the Groq free pool immediately when
 * it's configured (a second, independent quota), otherwise wait out the
 * suggested delay and retry once — free-tier per-minute quotas routinely
 * trip mid-way through multi-call flows like the website builder.
 */
async function completeText(
  system: string,
  user: string,
  keys: OverrideKeys,
  maxTokens = 8000
): Promise<string> {
  try {
    return await completeTextOnce(system, user, keys, maxTokens);
  } catch (err) {
    if (!isRateLimit(err)) throw err;
    if (hasGroqFallback(resolveBackend(keys))) {
      console.warn("[ai] rate limited — failing over to Groq");
      // If Groq is also limited, throw: the client paces long retries with
      // a visible countdown; sleeping here risks the function time limit.
      return completeTextGroq(system, user, maxTokens);
    }
    await new Promise((r) => setTimeout(r, retryDelayMs(err)));
    return completeTextOnce(system, user, keys, maxTokens);
  }
}

/**
 * Wrap a stream so a rate limit on the first token fails over to a fallback
 * stream (Groq) instead of erroring the response.
 */
async function* streamWithFallback(
  primary: AsyncIterable<string>,
  fallback: (() => AsyncIterable<string>) | null
): AsyncIterable<string> {
  const it = primary[Symbol.asyncIterator]();
  let first: IteratorResult<string>;
  try {
    first = await it.next();
  } catch (err) {
    if (isRateLimit(err) && fallback) {
      console.warn("[ai] stream rate limited — failing over to Groq");
      yield* fallback();
      return;
    }
    throw err;
  }
  if (first.done) return;
  yield first.value;
  while (true) {
    const next = await it.next();
    if (next.done) return;
    yield next.value;
  }
}

function groqStream(system: string, messages: ChatTurn[], maxTokens: number): AsyncIterable<string> {
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
  return openaiTextStream(
    client.chat.completions.stream({
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      max_tokens: maxTokens,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages],
    })
  );
}

/** Direct Groq completion, bypassing backend resolution (fallback path). */
async function completeTextGroq(
  system: string,
  user: string,
  maxTokens = 8000
): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
  const res = await client.chat.completions.create({
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

async function completeTextOnce(
  system: string,
  user: string,
  keys: OverrideKeys,
  maxTokens = 8000
): Promise<string> {
  const backend = resolveBackend(keys);
  const ollamaOpts: OllamaOpts = { url: keys.ollamaUrl, model: keys.ollamaModel };

  if (backend === "anthropic") {
    const res = await anthropicClient(keys.anthropic).messages.create({
      model: routeModel("codegen"),
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }
  if (backend === "gemini") {
    const res = await geminiClient(keys.google).models.generateContent({
      model: geminiModel(),
      contents: `${system}\n\n${user}`,
    });
    return res.text ?? "";
  }
  const res = await openaiClient(ollamaOpts).chat.completions.create({
    model: openaiModel(ollamaOpts),
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

/** Compact blueprint context shared by the plan and per-file calls. */
function siteContext(project: Project): string {
  const bp = project.blueprint;
  return JSON.stringify(
    {
      appName: project.name,
      description: project.description,
      prd: bp?.prd,
      userFlows: bp?.userFlows,
      pagesAndComponents: bp?.nodes
        .filter((n) => n.type === "page" || n.type === "component")
        .map((n) => ({ label: n.label, type: n.type, description: n.description })),
      dataEntities: bp?.databaseSchema?.entities?.map((e) => ({
        name: e.name,
        fields: e.fields.map((f) => f.name),
      })),
      designSystem: bp?.frontendArchitecture?.designSystem,
    },
    null,
    1
  );
}

const SitePlanSchema = z.object({
  files: z
    .array(z.object({ path: z.string(), purpose: z.string() }))
    .min(4)
    .max(20),
});

export async function generateSitePlan(
  project: Project,
  keys: OverrideKeys = {}
): Promise<SitePlanFile[]> {
  const raw = await completeText(
    SITE_PLAN_SYSTEM,
    `# Product Blueprint\n${siteContext(project)}\n\nProduce the file manifest JSON now.`,
    keys,
    4000
  );
  const parsed = SitePlanSchema.parse(JSON.parse(stripCodeFences(raw)));
  // Normalise: everything under src/, required files present.
  const files = parsed.files
    .map((f) => ({ ...f, path: f.path.replace(/^\.?\//, "") }))
    .filter((f) => f.path.startsWith("src/"));
  const ensure = (path: string, purpose: string) => {
    if (!files.some((f) => f.path === path)) files.push({ path, purpose });
  };
  ensure("src/App.jsx", "Shared layout and the <Routes> block routing every page.");
  ensure("src/components/Nav.jsx", "Top navigation with links to every page.");
  ensure("src/data/mock.js", "Named exports with realistic mock data for the whole site.");
  ensure("src/styles.css", "Global styles that complement Tailwind utilities.");
  return files;
}

/**
 * Slim context for per-file calls — the manifest is the real contract, so a
 * compact brief keeps every call well under free-tier per-minute token
 * limits (the full blueprint context is only needed for planning).
 */
function siteContextSlim(project: Project): string {
  const bp = project.blueprint;
  return JSON.stringify(
    {
      appName: project.name,
      description: project.description,
      vision: bp?.prd?.vision,
      dataEntities: bp?.databaseSchema?.entities?.map((e) => e.name),
      designSystem: bp?.frontendArchitecture?.designSystem,
    },
    null,
    1
  );
}

export async function generateSiteFile(
  project: Project,
  plan: SitePlanFile[],
  file: SitePlanFile,
  keys: OverrideKeys = {}
): Promise<string> {
  const manifest = plan.map((f) => `- ${f.path}: ${f.purpose}`).join("\n");
  const user = [
    `# App\n${siteContextSlim(project)}`,
    `# Site manifest (the only files that exist)\n${manifest}`,
    `# Your file\nWrite the complete contents of ${file.path}.\nPurpose: ${file.purpose}`,
  ].join("\n\n");

  let code = stripCodeFences(await completeText(SITE_FILE_SYSTEM, user, keys, 8000));

  // Validate; one retry with the problem fed back.
  const problem = validateSiteFile(file.path, code);
  if (problem) {
    code = stripCodeFences(
      await completeText(
        SITE_FILE_SYSTEM,
        `${user}\n\n# Your previous attempt was rejected\nProblem: ${problem}\nRewrite ${file.path} fixing this. Output only the file contents.`,
        keys,
        8000
      )
    );
  }
  return code;
}

function validateSiteFile(path: string, code: string): string | null {
  if (!code.trim()) return "The file was empty.";
  if (path.endsWith(".jsx") && !code.includes("export default")) {
    return "Component files must have a default export.";
  }
  if (path === "src/App.jsx" && code.includes("<BrowserRouter")) {
    return "App.jsx must not render <BrowserRouter> — main.jsx already provides it.";
  }
  if (/from\s+["'](?!react|react-dom|react-router-dom|\.{1,2}\/)/.test(code)) {
    return "Imports are only allowed from react, react-router-dom, or relative manifest files.";
  }
  return null;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function streamChat(project: Project, messages: ChatTurn[], keys: OverrideKeys = {}): AsyncIterable<string> {
  const backend = resolveBackend(keys);
  const ollamaOpts: OllamaOpts = { url: keys.ollamaUrl, model: keys.ollamaModel };
  const bp = project.blueprint;

  const blueprintSummary = bp ? {
    summary: bp.summary,
    techStack: bp.techStack,
    nodes: bp.nodes.map((n) => ({ id: n.id, label: n.label, type: n.type, status: n.status })),
    gaps: bp.gaps,
    prd: bp.prd,
    memory: bp.memory,
    userFlows: bp.userFlows?.map((f) => ({ name: f.name, actor: f.actor, outcome: f.outcome })),
  } : null;

  const context = {
    name: project.name,
    description: project.description,
    inputs: project.items.map((i) => ({ kind: i.kind, title: i.title, content: i.content.slice(0, 2000) })),
    blueprint: blueprintSummary,
    generatedArtifacts: (project.generated ?? []).map((g) => g.title),
  };

  const systemWithContext = `${CHAT_SYSTEM}\n\n# Project context\n${JSON.stringify(context, null, 1)}`;

  if (backend === "anthropic") {
    return anthropicTextStream(
      anthropicClient(keys.anthropic).messages.stream({
        model: routeModel("chat"),
        max_tokens: 8000,
        thinking: { type: "adaptive" },
        system: systemWithContext,
        messages,
      })
    );
  }

  if (backend === "gemini") {
    const fullPrompt = `${systemWithContext}\n\n${messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n")}`;
    return streamWithFallback(
      geminiTextStream(fullPrompt, keys.google),
      hasGroqFallback(backend) ? () => groqStream(systemWithContext, messages, 8000) : null
    );
  }

  return openaiTextStream(
    openaiClient(ollamaOpts).chat.completions.stream({
      model: openaiModel(ollamaOpts),
      max_tokens: 8000,
      stream: true,
      messages: [{ role: "system", content: systemWithContext }, ...messages],
    })
  );
}

// ─── Stream adapters ──────────────────────────────────────────────────────────

async function* geminiTextStream(prompt: string, apiKey?: string): AsyncIterable<string> {
  const stream = await geminiClient(apiKey).models.generateContentStream({
    model: geminiModel(),
    contents: prompt,
  });
  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}

async function* anthropicTextStream(
  stream: ReturnType<Anthropic["messages"]["stream"]>
): AsyncIterable<string> {
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

async function* openaiTextStream(
  stream: ReturnType<OpenAI["chat"]["completions"]["stream"]>
): AsyncIterable<string> {
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
