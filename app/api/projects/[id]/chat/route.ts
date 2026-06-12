import { NextResponse } from "next/server";
import { isDemoMode, streamChat, type ChatTurn } from "@/lib/claude";
import { demoChatReply } from "@/lib/demo";
import { getProject } from "@/lib/store";

export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json();
  const messages: ChatTurn[] = Array.isArray(body.messages)
    ? body.messages
        .filter(
          (m: ChatTurn) =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim()
        )
        .slice(-30)
    : [];
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "last message must be from the user" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  if (isDemoMode()) {
    const reply = demoChatReply(messages[messages.length - 1].content);
    const chunks = reply.match(/[\s\S]{1,60}/g) ?? [];
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
          await new Promise((r) => setTimeout(r, 12));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const messageStream = streamChat(project, messages);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `\n\n[Chat error: ${err instanceof Error ? err.message : "unknown"}]`
          )
        );
        controller.close();
      }
    },
    cancel() {
      messageStream.abort();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
