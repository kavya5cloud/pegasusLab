import { NextResponse } from "next/server";
import { friendlyAIError, generatePreviewApp, isDemoMode } from "@/lib/claude";
import { demoPreviewApp } from "@/lib/demo";
import { getProject } from "@/lib/store";
import { getOwner } from "@/lib/session";

export const maxDuration = 120;

// POST /api/projects/[id]/preview — generate a self-contained App.jsx that
// demonstrates the fix for a gap, runnable in a WebContainer live preview.
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

  const body = await req.json();
  const gap = project.blueprint.gaps.find((g) => g.id === body.gapId);
  if (!gap) {
    return NextResponse.json({ error: "gap not found" }, { status: 404 });
  }

  const overrideKeys = {
    anthropic:   req.headers.get("x-anthropic-key") ?? undefined,
    google:      req.headers.get("x-google-key") ?? undefined,
    ollamaUrl:   req.headers.get("x-ollama-url") ?? undefined,
    ollamaModel: req.headers.get("x-ollama-model") ?? undefined,
  };

  if (isDemoMode() && !overrideKeys.anthropic && !overrideKeys.google && !overrideKeys.ollamaUrl) {
    return NextResponse.json({ code: demoPreviewApp(gap) });
  }

  try {
    let code = await generatePreviewApp(project, gap, overrideKeys);
    // Safety net — if the model returned something unusable, fall back so the
    // sandbox always has a valid component to boot.
    if (!code.includes("export default")) code = demoPreviewApp(gap);
    return NextResponse.json({ code });
  } catch (err) {
    const { message, status } = friendlyAIError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
