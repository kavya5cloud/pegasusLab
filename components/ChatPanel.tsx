"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import type { Project } from "@/lib/types";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should we build first?",
  "Any risks in this architecture?",
  "Which database tables do we need?",
];

export default function ChatPanel({
  project,
  onClose,
  onRunBuild,
}: {
  project: Project;
  onClose: () => void;
  onRunBuild: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setInput("");
    const history: Turn[] = [...turns, { role: "user", content }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Chat failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content:
              next[next.length - 1].content +
              `\n[Error: ${e instanceof Error ? e.message : "unknown"}]`,
          };
          return next;
        });
      }
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-[440px] flex flex-col shadow-2xl bg-white"
      style={{ borderLeft: "1px solid var(--hairline)", color: "var(--ink)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="logo" size={15} />
          <h3 className="text-sm font-semibold truncate">Chat about {project.name}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRunBuild}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-500"
          >
            Run blueprint build
          </button>
          <button onClick={onClose} style={{ color: "var(--ink-muted)" }} title="Close">
            <Icon name="close" size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
        {turns.length === 0 && (
          <div className="pt-6">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--ink-muted)" }}>
              Talk the build through with Pegasus — it knows everything on the
              board{project.blueprint ? " and the full blueprint" : ""}.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-[12px] rounded-xl border px-3 py-2 hover:border-blue-600 transition-colors"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : "flex"}>
            <div
              className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap"
              style={
                t.role === "user"
                  ? { background: "#141414", color: "#ffffff" }
                  : { background: "#f5f5f5" }
              }
            >
              {t.content ||
                (streaming && i === turns.length - 1 ? (
                  <span
                    className="animate-pulse-soft inline-block w-2 h-3.5 align-middle"
                    style={{ background: "var(--ink-muted)" }}
                  />
                ) : (
                  ""
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 shrink-0"
        style={{ borderTop: "1px solid var(--hairline)" }}
      >
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--hairline)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Pegasus about the build…"
            className="flex-1 text-[13px] outline-none bg-transparent"
            autoFocus
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1.5 disabled:opacity-40"
            aria-label="Send"
          >
            <Icon name="arrow-right" size={12} strokeWidth={2.2} />
          </button>
        </div>
      </form>
    </div>
  );
}
