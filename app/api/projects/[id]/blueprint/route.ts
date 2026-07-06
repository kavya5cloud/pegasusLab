import { NextResponse } from "next/server";
import { friendlyAIError, generateBlueprint, isDemoMode } from "@/lib/claude";
import { demoBlueprint } from "@/lib/demo";
import { fetchRepoContext } from "@/lib/github";
import { getProject, updateProject } from "@/lib/store";
import { getOwner } from "@/lib/session";

export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await getOwner();
  const project = await getProject(id, owner);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const overrideKeys = {
    anthropic:   req.headers.get("x-anthropic-key") ?? undefined,
    google:      req.headers.get("x-google-key") ?? undefined,
    ollamaUrl:   req.headers.get("x-ollama-url") ?? undefined,
    ollamaModel: req.headers.get("x-ollama-model") ?? undefined,
    github:      req.headers.get("x-github-token") ?? undefined,
  };

  try {
    const demo = isDemoMode() && !overrideKeys.anthropic && !overrideKeys.google && !overrideKeys.ollamaUrl;
    let blueprint;
    if (demo) {
      blueprint = demoBlueprint(project);
    } else {
      const githubContext: Record<string, string> = {};
      await Promise.all(
        project.items
          .filter((i) => i.kind === "github" && i.content.trim())
          .map(async (i) => {
            githubContext[i.id] = await fetchRepoContext(i.content.trim(), overrideKeys.github);
          })
      );
      blueprint = await generateBlueprint(project, githubContext, overrideKeys);
    }
    const updated = await updateProject(id, { blueprint, demo }, owner);
    return NextResponse.json(updated);
  } catch (err) {
    const { message, status } = friendlyAIError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
