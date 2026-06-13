import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/store";
import { getOwner } from "@/lib/session";
import type { BoardItem } from "@/lib/types";

export async function GET() {
  const owner = await getOwner();
  const projects = await listProjects(owner);
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const items: BoardItem[] = Array.isArray(body.items) ? body.items : [];
  const owner = await getOwner();
  const project = await createProject({ name, description, items }, owner);
  return NextResponse.json(project, { status: 201 });
}
