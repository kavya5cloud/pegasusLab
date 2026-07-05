import { NextResponse } from "next/server";
import { deleteProject, getProject, updateProject } from "@/lib/store";
import { getOwner } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await getOwner();
  const project = await getProject(id, owner);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (Array.isArray(body.items)) patch.items = body.items;
  if (Array.isArray(body.generated)) patch.generated = body.generated;
  if (body.blueprint && typeof body.blueprint === "object") patch.blueprint = body.blueprint;
  if (body.site && typeof body.site === "object") patch.site = body.site;
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.description === "string") patch.description = body.description;
  const owner = await getOwner();
  const updated = await updateProject(id, patch, owner);
  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await getOwner();
  const ok = await deleteProject(id, owner);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
