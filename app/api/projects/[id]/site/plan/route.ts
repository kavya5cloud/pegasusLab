import { NextResponse } from "next/server";
import { extractDesignTokens, friendlyAIError, generateSitePlan, isDemoMode } from "@/lib/claude";
import { demoSitePlan } from "@/lib/demo";
import { getProject } from "@/lib/store";
import { getOwner } from "@/lib/session";

export const maxDuration = 120;

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
    // extracts their exact style so the whole site replicates it.
    let tokens = null;
    let designSkipped: string | null = null;
    const hasImages = project.items.some((i) => i.kind === "image" && i.dataUrl);
    if (hasImages) {
      try {
        tokens = await extractDesignTokens(project, overrideKeys);
      } catch (err) {
        // Don't fail the build over the design pass — but never hide it either.
        console.warn("[site/plan] design token extraction failed:", err);
        designSkipped = friendlyAIError(err).status === 429 ? "rate_limit" : "error";
      }
    }
    const plan = await generateSitePlan(project, overrideKeys, tokens);
    return NextResponse.json({ plan, tokens, designSkipped, demo: false });
  } catch (err) {
    const { message, status } = friendlyAIError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
