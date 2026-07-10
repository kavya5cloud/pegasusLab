import { NextResponse } from "next/server";
import { friendlyAIError, generateSiteFile, isDemoMode } from "@/lib/claude";
import { demoSiteFiles } from "@/lib/demo";
import { getProject } from "@/lib/store";
import { getOwner } from "@/lib/session";
import type { SiteFile, SitePlanFile } from "@/lib/types";

export const maxDuration = 120;

// POST /api/projects/[id]/site/file — generate ONE file of the website.
// The client orchestrates the loop so progress streams file by file and
// each serverless invocation stays small.
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
  const plan: SitePlanFile[] = Array.isArray(body.plan) ? body.plan : [];
  const file: SitePlanFile | undefined =
    body.file && typeof body.file.path === "string" ? body.file : undefined;
  // Files generated earlier in this build — fed forward so this file agrees
  // with their exports, data shapes and prop interfaces.
  const written: SiteFile[] = Array.isArray(body.written)
    ? body.written.filter(
        (w: SiteFile) => w && typeof w.path === "string" && typeof w.code === "string"
      )
    : [];
  if (!file || plan.length === 0) {
    return NextResponse.json({ error: "plan and file are required" }, { status: 400 });
  }

  const overrideKeys = {
    anthropic:   req.headers.get("x-anthropic-key") ?? undefined,
    google:      req.headers.get("x-google-key") ?? undefined,
    ollamaUrl:   req.headers.get("x-ollama-url") ?? undefined,
    ollamaModel: req.headers.get("x-ollama-model") ?? undefined,
  };

  if (isDemoMode() && !overrideKeys.anthropic && !overrideKeys.google && !overrideKeys.ollamaUrl) {
    const demo = demoSiteFiles(project).find((f) => f.path === file.path);
    return NextResponse.json({
      code: demo?.code ?? `// ${file.path}\n// ${file.purpose}\nexport default function Placeholder() { return null; }\n`,
    });
  }

  try {
    const code = await generateSiteFile(project, plan, file, overrideKeys, written);
    return NextResponse.json({ code });
  } catch (err) {
    const { message, status } = friendlyAIError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
