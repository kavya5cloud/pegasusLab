import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { z } from "zod";
import type { Blueprint, Gap, Project } from "./types";

// ---------------------------------------------------------------------------
// Backend selection
// Priority: Anthropic → Groq → Ollama → demo
// ---------------------------------------------------------------------------

type Backend = "anthropic" | "groq" | "ollama" | "demo";

function getBackend(): Backend {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) return "ollama";
  return "demo";
}

export function isDemoMode(): boolean {
  return getBackend() === "demo";
}

export function getBackendLabel(): string {
  const b = getBackend();
  if (b === "anthropic") return `Anthropic (${process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8"})`;
  if (b === "groq") return `Groq (${process.env.GROQ_MODEL ?? "llama-3.1-70b-versatile"})`;
  if (b === "ollama") return `Ollama (${process.env.OLLAMA_MODEL ?? "llama3.1"})`;
  return "demo";
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "demo",
});

function openaiClient(): OpenAI {
  if (process.env.GROQ_API_KEY) {
    return new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  // Ollama
  return new OpenAI({
    apiKey: "ollama", // Ollama ignores the key
    baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  });
}

function openaiModel(): string {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_MODEL ?? "llama-3.1-70b-versatile";
  return process.env.OLLAMA_MODEL ?? "llama3.1";
}

// ---------------------------------------------------------------------------
// Zod schema for blueprint
// ---------------------------------------------------------------------------

const NodeTypeSchema = z.enum([
  "page", "component", "api", "service", "database", "external", "design", "doc",
]);
const StatusSchema = z.enum(["existing", "partial", "missing"]);

const BlueprintSchema = z.object({
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
});

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const BLUEPRINT_SYSTEM = `You are the blueprint engine of Pegasus AI, an AI-powered workspace where people drop everything they have about an application — ideas, code snippets, GitHub repos, Figma designs, screenshots, docs — onto a whiteboard, and Pegasus turns it into a living blueprint of the complete application.

Given the whiteboard contents, you produce a complete architectural blueprint:

- nodes: every meaningful piece of the application — pages, UI components, API endpoints, backend services, database tables, external integrations, design artifacts, and documentation. Mark each node's status: "existing" (clearly present in the materials), "partial" (mentioned or half-built), or "missing" (required for the app to function or to be complete, but absent). Design screenshots count as evidence of intended UI — map every screen and major component you can see in them.
- edges: how the pieces connect (data flow, calls, renders, reads/writes). An edge is "missing" when the connection itself still needs to be built.
- gaps: concrete, actionable findings — missing features, broken or absent integrations, architecture risks, security holes, data-model problems, UX holes. Each gap references the node ids it concerns and gives a specific recommendation.

Rules:
- Node ids are short kebab-case slugs, unique across the blueprint.
- Edge source/target must reference node ids that exist in nodes.
- Be concrete: 12-30 nodes for a typical app, 4-10 gaps. Infer industry-standard pieces (auth, billing, observability) when the app clearly needs them and mark them missing rather than omitting them.
- Descriptions are one or two sentences, written for the developer who will build this.`;

const BLUEPRINT_JSON_SUFFIX = `

Respond with a single valid JSON object (no markdown, no code fences) matching this exact structure:
{
  "summary": "string",
  "techStack": ["string"],
  "nodes": [{ "id": "kebab-slug", "label": "string", "type": "page|component|api|service|database|external|design|doc", "status": "existing|partial|missing", "description": "string", "tech": "string or null" }],
  "edges": [{ "source": "node-id", "target": "node-id", "label": "string or null", "status": "existing|partial|missing" }],
  "gaps": [{ "title": "string", "severity": "critical|high|medium|low", "category": "missing-feature|integration|architecture|security|data|ux", "description": "string", "recommendation": "string", "relatedNodeIds": ["node-id"] }]
}`;

const CODEGEN_SYSTEM = `You are the code generation engine of Pegasus AI. You receive an application blueprint (nodes, edges, tech stack) built from the user's whiteboard, and one specific gap to close.

Generate the complete, production-quality code that closes the gap, consistent with the project's tech stack and existing architecture. Output format:

1. One short paragraph: what you are building and how it plugs into the blueprint.
2. Each file as a fenced code block preceded by a "### path/to/file.ext" heading.
3. End with a short "### Wiring it up" section listing any installs, env vars, and where existing files must be touched.

Write real, runnable code — no placeholders like "implement here". Match the conventions implied by the whiteboard materials when available.`;

const CHAT_SYSTEM = `You are Pegasus, the build copilot inside pegasus lab. The user is building an application from a whiteboard of ideas, code, repos and designs. You have the full project context below.

Help them: refine the blueprint, decide what to build first, reason about architecture and databases, and plan the ship. Be concrete and concise — short paragraphs, no filler. When you reference parts of the app, use the blueprint node labels. When they ask for code, give real code.`;

// ---------------------------------------------------------------------------
// Board → text content (shared across backends)
// ---------------------------------------------------------------------------

const KIND_LABEL: Record<string, string> = {
  idea: "Idea note", code: "Code snippet", github: "GitHub repository",
  figma: "Figma design", image: "Design screenshot", doc: "Documentation",
};

function boardToText(project: Project, githubContext: Record<string, string> = {}): string {
  const parts: string[] = [
    `# Project: ${project.name}`,
    project.description ? `## Description\n${project.description}` : "",
  ];
  for (const item of project.items) {
    if (item.kind === "image") continue; // handled separately for Anthropic
    const label = KIND_LABEL[item.kind] ?? item.kind;
    if (item.kind === "github") {
      const ctx = githubContext[item.id];
      parts.push(`## Board card: ${label} — "${item.title}"\nURL: ${item.content}\n${ctx ? `Fetched repository context:\n${ctx}` : ""}`);
      continue;
    }
    const content = item.content.length > 60_000 ? item.content.slice(0, 60_000) + "\n...[truncated]" : item.content;
    parts.push(`## Board card: ${label} — "${item.title}"\n${content}`);
  }
  parts.push("Analyze every card on the whiteboard above and produce the complete blueprint as structured output.");
  return parts.filter(Boolean).join("\n\n");
}

// ---------------------------------------------------------------------------
// Blueprint generation
// ---------------------------------------------------------------------------

export async function generateBlueprint(
  project: Project,
  githubContext: Record<string, string> = {}
): Promise<Blueprint> {
  const backend = getBackend();

  if (backend === "anthropic") {
    return generateBlueprintAnthropic(project, githubContext);
  }
  return generateBlueprintOpenAI(project, githubContext);
}

async function generateBlueprintAnthropic(
  project: Project,
  githubContext: Record<string, string>
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
        textParts.push(`## Board card: ${label} — "${item.title}"\n${item.content || "(see attached image)"}\nThe screenshot itself is attached below.`);
        imageBlocks.push({ type: "image", source: { type: "base64", media_type: match[1] as "image/png" | "image/jpeg" | "image/gif" | "image/webp", data: match[2] } });
        imageBlocks.push({ type: "text", text: `(The image above is board card "${item.title}".)` });
      }
      continue;
    }
    if (item.kind === "github") {
      const ctx = githubContext[item.id];
      textParts.push(`## Board card: ${label} — "${item.title}"\nURL: ${item.content}\n${ctx ? `Fetched repository context:\n${ctx}` : ""}`);
      continue;
    }
    const content = item.content.length > 60_000 ? item.content.slice(0, 60_000) + "\n...[truncated]" : item.content;
    textParts.push(`## Board card: ${label} — "${item.title}"\n${content}`);
  }
  textParts.push("Analyze every card on the whiteboard above and produce the complete blueprint as structured output.");

  const userContent: ContentParam = [
    { type: "text", text: textParts.filter(Boolean).join("\n\n") },
    ...imageBlocks,
  ];

  const response = await anthropic.messages.parse({
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
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
  githubContext: Record<string, string>
): Promise<Blueprint> {
  const client = openaiClient();
  const model = openaiModel();
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

function finishBlueprint(parsed: z.infer<typeof BlueprintSchema>): Blueprint {
  const nodeIds = new Set(parsed.nodes.map((n) => n.id));
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Code generation — returns AsyncIterable<string> (backend-agnostic)
// ---------------------------------------------------------------------------

export function streamGapCode(project: Project, gap: Gap): AsyncIterable<string> {
  const backend = getBackend();
  const bp = project.blueprint;
  const context = {
    name: project.name, description: project.description,
    techStack: bp?.techStack ?? [], summary: bp?.summary ?? "",
    nodes: bp?.nodes ?? [], edges: bp?.edges ?? [],
  };
  const boardExcerpts = project.items
    .filter((i) => i.kind !== "image")
    .map((i) => `## ${i.title} (${i.kind})\n\`\`\`\n${i.content.slice(0, 20_000)}\n\`\`\``)
    .join("\n\n");

  const userMessage = [
    `# Blueprint\n${JSON.stringify(context, null, 2)}`,
    boardExcerpts ? `# Whiteboard excerpts\n${boardExcerpts}` : "",
    `# Gap to close\n${JSON.stringify(gap, null, 2)}`,
    "Generate the code that closes this gap.",
  ].filter(Boolean).join("\n\n");

  if (backend === "anthropic") {
    return anthropicTextStream(
      anthropic.messages.stream({
        model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        system: CODEGEN_SYSTEM,
        messages: [{ role: "user", content: userMessage }],
      })
    );
  }

  return openaiTextStream(
    openaiClient().chat.completions.stream({
      model: openaiModel(),
      max_tokens: 16000,
      stream: true,
      messages: [
        { role: "system", content: CODEGEN_SYSTEM },
        { role: "user", content: userMessage },
      ],
    })
  );
}

// ---------------------------------------------------------------------------
// Chat — returns AsyncIterable<string>
// ---------------------------------------------------------------------------

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function streamChat(project: Project, messages: ChatTurn[]): AsyncIterable<string> {
  const backend = getBackend();
  const bp = project.blueprint;
  const context = {
    name: project.name, description: project.description,
    board: project.items.map((i) => ({ kind: i.kind, title: i.title, content: i.content.slice(0, 2000) })),
    blueprint: bp ? {
      summary: bp.summary, techStack: bp.techStack,
      nodes: bp.nodes.map((n) => ({ id: n.id, label: n.label, type: n.type, status: n.status })),
      gaps: bp.gaps,
    } : null,
    generated: (project.generated ?? []).map((g) => g.title),
  };
  const systemWithContext = `${CHAT_SYSTEM}\n\n# Project context\n${JSON.stringify(context, null, 1)}`;

  if (backend === "anthropic") {
    return anthropicTextStream(
      anthropic.messages.stream({
        model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
        max_tokens: 8000,
        thinking: { type: "adaptive" },
        system: systemWithContext,
        messages,
      })
    );
  }

  return openaiTextStream(
    openaiClient().chat.completions.stream({
      model: openaiModel(),
      max_tokens: 8000,
      stream: true,
      messages: [
        { role: "system", content: systemWithContext },
        ...messages,
      ],
    })
  );
}

// ---------------------------------------------------------------------------
// Stream adapters — normalize to AsyncIterable<string>
// ---------------------------------------------------------------------------

async function* anthropicTextStream(
  stream: ReturnType<typeof anthropic.messages.stream>
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
