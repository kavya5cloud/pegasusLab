"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export default function CodePanel({
  title,
  content,
  streaming,
  onClose,
}: {
  title: string;
  content: string;
  streaming: boolean;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, streaming]);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-[640px] flex flex-col shadow-2xl"
      style={{ background: "var(--panel)", borderLeft: "1px solid var(--line)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${streaming ? "animate-pulse-soft" : ""}`}
            style={{ background: streaming ? "var(--accent)" : "var(--ok)" }}
          />
          <h3 className="text-sm font-medium truncate">
            {streaming ? "Generating: " : "Generated: "}
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="text-xs px-2 py-1 rounded"
            style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded"
            style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
          >
            <span className="flex items-center gap-1">
              Close <Icon name="close" size={10} strokeWidth={2} />
            </span>
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto p-4">
        <pre
          className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono"
          style={{ color: "var(--foreground)" }}
        >
          {content || "Connecting to the blueprint engine…"}
          {streaming && <span className="animate-pulse-soft inline-block w-2 h-3.5 align-middle" style={{ background: "var(--accent)" }} />}
        </pre>
      </div>
    </div>
  );
}
