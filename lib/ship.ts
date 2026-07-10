import type { Blueprint, GeneratedArtifact, Project } from "./types";
import { siteStaticFiles } from "./site-scaffold";

export interface ShipFile {
  path: string;
  content: string;
}

/**
 * The generated website as a complete, runnable repository: fixed scaffold
 * (package.json, vite config, index.html, main.jsx, README) plus every
 * AI-generated src/ file, and a PEGASUS.md manifest.
 */
export function siteToFiles(project: Project): ShipFile[] {
  const site = project.site;
  if (!site || site.files.length === 0) return [];

  const files = new Map<string, string>();
  const fonts = site.tokens?.typography?.fontFamilies ?? [];
  for (const f of [...siteStaticFiles(project.name, fonts), ...site.files]) {
    files.set(f.path, f.code);
  }

  files.set(
    "PEGASUS.md",
    [
      `# ${project.name}`,
      "",
      project.description,
      "",
      project.blueprint ? `## Blueprint summary\n\n${project.blueprint.summary}` : "",
      `## Site files\n\n${site.plan.map((p) => `- \`${p.path}\` — ${p.purpose}`).join("\n")}`,
      "",
      `Generated ${site.generatedAt}.`,
      "",
      "_Built with pegasus lab. — whiteboard in, working app out._",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return [...files.entries()].map(([path, content]) => ({ path, content }));
}

/**
 * Pegasus codegen output formats each file as a "### path/to/file" heading
 * followed by a fenced code block. Parse those into committable files.
 */
export function artifactsToFiles(
  project: Pick<Project, "name" | "description">,
  blueprint: Blueprint | null,
  artifacts: GeneratedArtifact[]
): ShipFile[] {
  const files = new Map<string, string>();

  for (const artifact of artifacts) {
    const re = /###\s+`?([^\n`]+?)`?\s*\n+```[a-zA-Z0-9.+-]*\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(artifact.content)) !== null) {
      const path = m[1].trim().replace(/^\.?\//, "");
      // Only accept things that look like file paths, skip prose headings.
      if (!/^[\w@][\w@.\-/[\]]*\.\w{1,12}$/.test(path)) continue;
      files.set(path, m[2]);
    }
  }

  // Always include a build manifest.
  const gapList = (blueprint?.gaps ?? [])
    .map((g) => `- **${g.title}** (${g.severity}): ${g.recommendation}`)
    .join("\n");
  const shipped = artifacts.map((a) => `- ${a.title}`).join("\n");
  files.set(
    "PEGASUS.md",
    [
      `# ${project.name}`,
      "",
      project.description,
      "",
      blueprint ? `## Blueprint summary\n\n${blueprint.summary}` : "",
      blueprint?.techStack.length
        ? `## Tech stack\n\n${blueprint.techStack.join(", ")}`
        : "",
      gapList ? `## Gaps identified\n\n${gapList}` : "",
      shipped ? `## Generated in this ship\n\n${shipped}` : "",
      "",
      "_Built with pegasus lab. — whiteboard in, working app out._",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return [...files.entries()].map(([path, content]) => ({ path, content }));
}
