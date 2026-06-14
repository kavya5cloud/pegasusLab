import { NextResponse } from "next/server";
import { getProjectByShareId } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const project = await getProjectByShareId(token);
  if (!project || !project.blueprint) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // Return only what's needed for the read-only view — no items/owner
  return NextResponse.json({
    id: project.id,
    name: project.name,
    description: project.description,
    blueprint: project.blueprint,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}
