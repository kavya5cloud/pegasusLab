import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/store";
import { getOwner } from "@/lib/session";

// POST /api/projects/[id]/share — toggle sharing on/off
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

  const body = await req.json().catch(() => ({}));
  const enable = body.enable !== false;

  let shareId: string | undefined;
  if (enable) {
    shareId = project.shareId ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }

  const updated = await updateProject(id, { shareId }, owner);
  return NextResponse.json({ shareId: updated?.shareId ?? null });
}
