import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { extractDesignTokens, friendlyAIError, generateSitePlan, isDemoMode } from "@/lib/claude";
import { demoSitePlan } from "@/lib/demo";
import { getProject, updateProject } from "@/lib/store";
import { getOwner } from "@/lib/session";
import type { DesignTokens, Project } from "@/lib/types";

export const maxDuration = 120;

/** Stable hash of the board's reference images — the design cache key. */
function imagesHash(project: Project): string | null {
  const urls = project.items
    .filter((i) => i.kind === "image" && i.dataUrl)
    .map((i) => i.dataUrl!)
    .sort();
  if (urls.length === 0) return null;
  return createHash("sha256").update(urls.join("|")).digest("hex");
}

// POST /api/projects/[id]/site/plan — produce the file manifest for the
// full website build, derived from the Product Blueprint.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await getOwner();
  const project = await getProject(id, owner);
  if (!project || !project.blueprint) {
    return NextResponse.json({ error: "project or blueprint not found" }, { status: 404 });
  }

  const overrideKeys = {
    anthropic:   req.headers.get("x-anthropic-key") ?? undefined,
    google:      req.headers.get("x-google-key") ?? undefined,
    ollamaUrl:   req.headers.get("x-ollama-url") ?? undefined,
    ollamaModel: req.headers.get("x-ollama-model") ?? undefined,
  };

  if (isDemoMode() && !overrideKeys.anthropic && !overrideKeys.google && !overrideKeys.ollamaUrl) {
    return NextResponse.json({ plan: demoSitePlan(), tokens: null, demo: true });
  }

  try {
    // Design DNA first: if the board has reference screenshots, a vision pass
    // extracts their exact style so the whole site replicates it. Extraction
    // is cached by image hash — vision runs once per unique design, so
    // rebuilds never re-spend quota and the design survives rate limits.
    let tokens: DesignTokens | null = null;
    let designSkipped: string | null = null;
    const hash = imagesHash(project);
    if (hash) {
      const cache = project.blueprint.designCache;
      if (cache && cache.hash === hash) {
        tokens = cache.tokens;
      } else {
        try {
          tokens = await extractDesignTokens(project, overrideKeys);
          if (tokens) {
            await updateProject(
              id,
              { blueprint: { ...project.blueprint, designCache: { hash, tokens } } },
              owner
            ).catch(() => {});
          }
        } catch (err) {
          // Don't fail the build over the design pass — but never hide it.
          console.warn("[site/plan] design token extraction failed:", err);
          designSkipped = friendlyAIError(err).status === 429 ? "rate_limit" : "error";
        }
      }
    }
    const plan = await generateSitePlan(project, overrideKeys, tokens);
    return NextResponse.json({ plan, tokens, designSkipped, demo: false });
  } catch (err) {
    const { message, status } = friendlyAIError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
