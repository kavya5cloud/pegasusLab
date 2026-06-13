import { NextResponse } from "next/server";
import { isDemoMode, streamGapCode } from "@/lib/claude";
import { DEMO_CODE } from "@/lib/demo";
import { getProject } from "@/lib/store";
import { getOwner } from "@/lib/session";

export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await getOwner();
  const project = await getProject(id, owner);
  if (!project || !project.blueprint) {
    return NextResponse.json(
      { error: "project or blueprint not found" },
      { status: 404 }
    );
  }

  const { gapId } = await req.json();
  const gap = project.blueprint.gaps.find((g) => g.id === gapId);
  if (!gap) {
    return NextResponse.json({ error: "gap not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  if (isDemoMode()) {
    // Simulate streaming so the UI behaves identically without a key.
    const chunks = DEMO_CODE.match(/[\s\S]{1,80}/g) ?? [];
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
          await new Promise((r) => setTimeout(r, 15));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const messageStream = streamGapCode(project, gap);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const text of messageStream) {
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `\n\n[Generation error: ${err instanceof Error ? err.message : "unknown"}]`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
