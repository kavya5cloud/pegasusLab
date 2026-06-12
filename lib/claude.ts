import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Blueprint, Gap, Project } from "./types";

export const MODEL = "claude-opus-4-8";

export function isDemoMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY;
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "demo",
});

const NodeTypeSchema = z.enum([
  "page",
  "component",
  "api",
  "service",
  "database",
  "external",
  "design",
  "doc",
]);
const StatusSchema = z.enum(["existing", "partial", "missing"]);

const BlueprintSchema = z.object({
  summary: z.string(),
  techStack: z.array(z.string()),
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: NodeTypeSchema,
      status: StatusSchema,
      description: z.string(),
      tech: z.string().nullable(),
    })
  ),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      label: z.string().nullable(),
      status: StatusSchema,
    })
  ),
  gaps: z.array(
    z.object({
      title: z.string(),
      severity: z.enum(["critical", "high", "medium", "low"]),
      category: z.enum([
        "missing-feature",
        "integration",
        "architecture",
        "security",
        "data",
        "ux",
      ]),
      description: z.string(),
      recommendation: z.string(),
      relatedNodeIds: z.array(z.string()),
    })
  ),
});

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

type ContentParam = Anthropic.ContentBlockParam[];

const KIND_LABEL: Record<string, string> = {
  idea: "Idea note",
  code: "Code snippet",
  github: "GitHub repository",
  figma: "Figma design",
  image: "Design screenshot",
  doc: "Documentation",
};

function boardToContent(
  project: Project,
  githubContext: Record<string, string>
): ContentParam {
  const textParts: string[] = [
    `# Project: ${project.name}`,
    project.description ? `## Description\n${project.description}` : "",
  ];

  const imageBlocks: ContentParam = [];

  for (const item of project.items) {
    const label = KIND_LABEL[item.kind] ?? item.kind;
    if (item.kind === "image" && item.dataUrl) {
      const match = item.dataUrl.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/);
      // Skip unparseable or oversized images (~5MB base64 cap).
      if (match && match[2].length < 5_000_000) {
        textParts.push(
          `## Board card: ${label} — "${item.title}"\n${item.content || "(see attached image)"}\nThe screenshot itself is attached below.`
        );
        imageBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: match[1] as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
            data: match[2],
          },
        });
        imageBlocks.push({
          type: "text",
          text: `(The image above is board card "${item.title}".)`,
        });
      }
      continue;
    }

    if (item.kind === "github") {
      const ctx = githubContext[item.id];
      textParts.push(
        `## Board card: ${label} — "${item.title}"\nURL: ${item.content}\n${ctx ? `Fetched repository context:\n${ctx}` : ""}`
      );
      continue;
    }

    const content =
      item.content.length > 60_000
        ? item.content.slice(0, 60_000) + "\n...[truncated]"
        : item.content;
    textParts.push(`## Board card: ${label} — "${item.title}"\n${content}`);
  }

  textParts.push(
    "Analyze every card on the whiteboard above and produce the complete blueprint as structured output."
  );

  return [
    { type: "text", text: textParts.filter(Boolean).join("\n\n") },
    ...imageBlocks,
  ];
}

export async function generateBlueprint(
  project: Project,
  githubContext: Record<string, string> = {}
): Promise<Blueprint> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: BLUEPRINT_SYSTEM,
    messages: [{ role: "user", content: boardToContent(project, githubContext) }],
    output_config: { format: zodOutputFormat(BlueprintSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Blueprint generation returned no parseable output");
  }

  const nodeIds = new Set(parsed.nodes.map((n) => n.id));
  const blueprint: Blueprint = {
    summary: parsed.summary,
    techStack: parsed.techStack,
    nodes: parsed.nodes.map((n) => ({ ...n, tech: n.tech ?? undefined })),
    edges: parsed.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e, i) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        label: e.label ?? undefined,
        status: e.status,
      })),
    gaps: parsed.gaps.map((g, i) => ({
      ...g,
      id: `gap-${i}`,
      relatedNodeIds: g.relatedNodeIds.filter((id) => nodeIds.has(id)),
    })),
  };
  return blueprint;
}

const CODEGEN_SYSTEM = `You are the code generation engine of Pegasus AI. You receive an application blueprint (nodes, edges, tech stack) built from the user's whiteboard, and one specific gap to close.

Generate the complete, production-quality code that closes the gap, consistent with the project's tech stack and existing architecture. Output format:

1. One short paragraph: what you are building and how it plugs into the blueprint.
2. Each file as a fenced code block preceded by a "### path/to/file.ext" heading.
3. End with a short "### Wiring it up" section listing any installs, env vars, and where existing files must be touched.

Write real, runnable code — no placeholders like "implement here". Match the conventions implied by the whiteboard materials when available.`;

export function streamGapCode(project: Project, gap: Gap) {
  const bp = project.blueprint;
  const context = {
    name: project.name,
    description: project.description,
    techStack: bp?.techStack ?? [],
    summary: bp?.summary ?? "",
    nodes: bp?.nodes ?? [],
    edges: bp?.edges ?? [],
  };
  const boardExcerpts = project.items
    .filter((i) => i.kind !== "image")
    .map(
      (i) =>
        `## ${i.title} (${i.kind})\n\`\`\`\n${i.content.slice(0, 20_000)}\n\`\`\``
    )
    .join("\n\n");

  return client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    system: CODEGEN_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          `# Blueprint\n${JSON.stringify(context, null, 2)}`,
          boardExcerpts ? `# Whiteboard excerpts\n${boardExcerpts}` : "",
          `# Gap to close\n${JSON.stringify(gap, null, 2)}`,
          "Generate the code that closes this gap.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  });
}
