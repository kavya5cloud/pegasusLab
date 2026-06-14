"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import type { Project } from "@/lib/types";

function userApiHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const key  = localStorage.getItem("pegasus_anthropic_key");
  const gkey = localStorage.getItem("pegasus_google_key");
  const headers: Record<string, string> = {};
  if (key)  headers["x-anthropic-key"] = key;
  if (gkey) headers["x-google-key"] = gkey;
  return headers;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should we build first?",
  "Any risks in this architecture?",
  "Which database tables do we need?",
  "Walk me through the user flows.",
  "What's the recommended tech stack?",
];

/* ─── Simple markdown renderer ────────────────────────────────────────────── */

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="my-2 rounded-lg overflow-hidden text-[11.5px]" style={{ background: "var(--code-bg, #1a1917)", border: "1px solid var(--code-border, #2d2b27)" }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: "1px solid var(--code-border, #2d2b27)" }}>
        <span className="font-mono text-[10px] opacity-50" style={{ color: "#a0a09a" }}>{lang || "code"}</span>
        <button
          onClick={copy}
          className="font-mono text-[10px] hover:opacity-100 transition-opacity flex items-center gap-1"
          style={{ color: copied ? "#22c55e" : "#a0a09a", opacity: 0.7 }}
        >
          <Icon name="copy" size={10} strokeWidth={2} />
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="px-3 py-2.5 overflow-x-auto" style={{ color: "#e8e6e3", lineHeight: 1.65 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  const codeBlockRe = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRe.exec(content)) !== null) {
    if (match.index > last) {
      parts.push(<InlineText key={`t${last}`} text={content.slice(last, match.index)} />);
    }
    parts.push(<CodeBlock key={`c${match.index}`} lang={match[1] || undefined} code={match[2].trimEnd()} />);
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    parts.push(<InlineText key={`t${last}`} text={content.slice(last)} />);
  }
  return <>{parts}</>;
}

function InlineText({ text }: { text: string }) {
  // Bold, inline code, paragraph breaks
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line === "") return i < lines.length - 1 ? <br key={i} /> : null;
        const parts: React.ReactNode[] = [];
        const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(line)) !== null) {
          if (m.index > last) parts.push(line.slice(last, m.index));
          const tok = m[0];
          if (tok.startsWith("`"))
            parts.push(<code key={m.index} className="font-mono text-[11px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.08)" }}>{tok.slice(1, -1)}</code>);
          else
            parts.push(<strong key={m.index}>{tok.slice(2, -2)}</strong>);
          last = m.index + tok.length;
        }
        if (last < line.length) parts.push(line.slice(last));
        return <span key={i}>{parts}{i < lines.length - 1 && <br />}</span>;
      })}
    </>
  );
}

/* ─── Blinking cursor ─────────────────────────────────────────────────────── */

function StreamCursor() {
  return (
    <span
      className="inline-block w-[2px] h-[13px] ml-0.5 align-middle rounded-sm"
      style={{ background: "var(--accent, #59e0c8)", animation: "blink 0.9s step-end infinite" }}
    />
  );
}

/* ─── Context chips ───────────────────────────────────────────────────────── */

function ContextChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border"
      style={{
        borderColor: active ? "var(--accent, #59e0c8)" : "var(--line, #e6e6e6)",
        color: active ? "var(--accent, #59e0c8)" : "var(--muted, #84817a)",
        background: active ? "rgba(89,224,200,0.06)" : "transparent",
      }}
    >
      {label}
    </span>
  );
}

/* ─── Main panel ──────────────────────────────────────────────────────────── */

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const bp = project.blueprint;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [input]);

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
        headers: { "Content-Type": "application/json", ...userApiHeaders() },
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
          next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + chunk };
          return next;
        });
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + `\n\n[Error: ${e instanceof Error ? e.message : "unknown"}]`,
          };
          return next;
        });
      }
    } finally {
      setStreaming(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <>
      {/* Inject blink keyframe once */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      <div
        className="flex flex-col h-full"
        style={{ background: "var(--panel)", color: "var(--foreground)", borderLeft: "1px solid var(--line)" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pegasus avatar */}
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
              style={{ background: "var(--accent)", color: "var(--panel)" }}
            >
              P
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold leading-tight truncate">Pegasus Chat</p>
              <p className="text-[10px] leading-tight truncate" style={{ color: "var(--muted)" }}>
                {project.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {turns.length > 0 && (
              <button
                onClick={() => setTurns([])}
                className="text-[11px] px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
                style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
                title="New chat"
              >
                New
              </button>
            )}
            <button
              onClick={onRunBuild}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
              style={{ background: "var(--accent)", color: "var(--panel)" }}
              title="Run full blueprint build"
            >
              Build
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted)" }}
              title="Close (Esc)"
            >
              <Icon name="close" size={12} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* ── Context chips ── */}
        <div
          className="flex items-center gap-1.5 px-4 py-2 shrink-0 flex-wrap"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <span className="text-[9px] font-mono uppercase tracking-widest mr-1" style={{ color: "var(--muted)", opacity: 0.5 }}>context</span>
          <ContextChip label="@board" active={(project.items?.length ?? 0) > 0} />
          <ContextChip label="@blueprint" active={!!bp} />
          <ContextChip label="@prd" active={!!bp?.prd} />
          <ContextChip label="@schema" active={!!bp?.databaseSchema} />
          <ContextChip label="@memory" active={!!bp?.memory} />
        </div>

        {/* ── Messages ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {turns.length === 0 && (
            <div className="pt-2">
              <div className="flex items-start gap-2.5 mb-5">
                <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5" style={{ background: "var(--accent)", color: "var(--panel)" }}>P</div>
                <p className="text-[12.5px] leading-relaxed pt-0.5" style={{ color: "var(--muted)" }}>
                  {bp
                    ? "I've read the full Product Blueprint — PRD, schema, API architecture, and all. What would you like to work on?"
                    : "I know everything on your board. Drop your build into chat or run the blueprint first for deeper context."}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-[12px] rounded-lg px-3 py-2 transition-colors"
                    style={{ border: "1px solid var(--line)", color: "var(--muted)", background: "var(--panel-2)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) => {
            const isUser = t.role === "user";
            const isLastAssistant = !isUser && i === turns.length - 1;
            const isEmpty = t.content === "";

            return (
              <div key={i} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                {!isUser && (
                  <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5" style={{ background: "var(--accent)", color: "var(--panel)" }}>P</div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                  style={
                    isUser
                      ? { background: "#1c1c1c", color: "#f0ede8", border: "1px solid #2d2b27" }
                      : { background: "var(--panel-2)", color: "var(--foreground)", border: "1px solid var(--line)" }
                  }
                >
                  {isEmpty && streaming && isLastAssistant ? (
                    <StreamCursor />
                  ) : (
                    <>
                      <MessageContent content={t.content} />
                      {streaming && isLastAssistant && <StreamCursor />}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Input ── */}
        <div className="shrink-0 p-3" style={{ borderTop: "1px solid var(--line)" }}>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--line)", background: "var(--panel-2)" }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about the build…"
              rows={1}
              disabled={streaming}
              autoFocus
              className="w-full resize-none bg-transparent outline-none text-[12.5px] px-3 pt-2.5 pb-1 placeholder:opacity-40 disabled:opacity-50"
              style={{ color: "var(--foreground)", maxHeight: 140 }}
            />
            <div className="flex items-center justify-between px-3 pb-2 pt-1">
              <span className="text-[10px] font-mono opacity-30" style={{ color: "var(--muted)" }}>
                ↵ send · ⇧↵ newline
              </span>
              <button
                onClick={() => send(input)}
                disabled={streaming || !input.trim()}
                className="h-6 w-6 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                style={{ background: "var(--accent)", color: "var(--panel)" }}
                aria-label="Send"
              >
                <Icon name="arrow-right" size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] font-mono mt-2 opacity-30" style={{ color: "var(--muted)" }}>
            intelligence routing · pegasus lab.
          </p>
        </div>
      </div>
    </>
  );
}
