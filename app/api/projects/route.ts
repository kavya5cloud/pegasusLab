import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/store";
import type { BoardItem } from "@/lib/types";

export async function GET() {
  const projects = await listProjects();
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
  const project = await createProject({ name, description, items });
  return NextResponse.json(project, { status: 201 });
}
