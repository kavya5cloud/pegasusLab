import { NextResponse } from "next/server";
import { demoBlueprint, DEMO_CODE } from "@/lib/demo";
import { createProject, updateProject } from "@/lib/store";
import { getOwner } from "@/lib/session";
import type { BoardItem } from "@/lib/types";

// Seeds a complete showcase build — board, blueprint, and one generated
// artifact — so the product can be demoed end to end in one click.
export async function POST() {
  const items: BoardItem[] = [
    {
      id: "smp-idea",
      kind: "idea",
      title: "The idea",
      content:
        "Lumen — a customer feedback hub. Teams collect feedback from email and Slack, cluster it into themes, and turn the top themes into roadmap items. Stripe-billed per seat.",
      x: 0,
      y: 40,
    },
    {
      id: "smp-code",
      kind: "code",
      title: "app/api/records/route.ts",
      content:
        'export async function GET() {\n  const records = await db.feedback.findMany({\n    orderBy: { createdAt: "desc" },\n  });\n  return Response.json(records);\n}',
      x: 320,
      y: 0,
    },
    {
      id: "smp-repo",
      kind: "github",
      title: "Existing prototype",
      content: "https://github.com/vercel/next.js",
      x: 640,
      y: 60,
    },
    {
      id: "smp-figma",
      kind: "figma",
      title: "Dashboard redesign",
      content: "https://figma.com/file/lumen-feedback-hub",
      x: 160,
      y: 300,
    },
    {
      id: "smp-doc",
      kind: "doc",
      title: "Launch checklist",
      content:
        "- Auth before anything else\n- Stripe checkout + webhook\n- Weekly digest email\n- Theme clustering v1 can be manual tags",
      x: 480,
      y: 320,
    },
  ];

  const owner = await getOwner();
  const project = await createProject({
    name: "Lumen — sample build",
    description:
      "A customer feedback hub: collect feedback, cluster it into themes, ship the roadmap. Seeded showcase project.",
    items,
  }, owner);

  const blueprint = demoBlueprint(project);
  const updated = await updateProject(project.id, {
    blueprint,
    demo: true,
    generated: [
      {
        id: "smp-gen",
        gapId: "gap-0",
        title: "No authentication system",
        content: DEMO_CODE,
        createdAt: new Date().toISOString(),
      },
    ],
  }, owner);

  return NextResponse.json(updated, { status: 201 });
}
