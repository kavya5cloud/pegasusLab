import { NextResponse } from "next/server";
import { generateBlueprint, isDemoMode } from "@/lib/claude";
import { demoBlueprint } from "@/lib/demo";
import { fetchRepoContext } from "@/lib/github";
import { getProject, updateProject } from "@/lib/store";
import { getOwner } from "@/lib/session";

export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await getOwner();
  const project = await getProject(id, owner);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const demo = isDemoMode();
    let blueprint;
    if (demo) {
      blueprint = demoBlueprint(project);
    } else {
      // Pull real context for any GitHub repo cards on the board.
      const githubContext: Record<string, string> = {};
      await Promise.all(
        project.items
          .filter((i) => i.kind === "github" && i.content.trim())
          .map(async (i) => {
            githubContext[i.id] = await fetchRepoContext(i.content.trim());
          })
      );
      blueprint = await generateBlueprint(project, githubContext);
    }
    const updated = await updateProject(id, { blueprint, demo }, owner);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "blueprint failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
