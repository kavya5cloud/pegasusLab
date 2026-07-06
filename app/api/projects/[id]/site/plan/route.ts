import { NextResponse } from "next/server";
import { friendlyAIError, generateSitePlan, isDemoMode } from "@/lib/claude";
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
    return NextResponse.json({ plan: demoSitePlan(), demo: true });
  }

  try {
    const plan = await generateSitePlan(project, overrideKeys);
    return NextResponse.json({ plan, demo: false });
  } catch (err) {
    const { message, status } = friendlyAIError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
