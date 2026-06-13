"use client";

import { useState } from "react";
import { Icon } from "./icons";
import type { GeneratedArtifact } from "@/lib/types";

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Parse the "### path/to/file" sections from a generated artifact. */
function parseFiles(content: string): { path: string; code: string; lang: string }[] {
  const files: { path: string; code: string; lang: string }[] = [];
  const re = /###\s+`?([^\n`]+?)`?\s*\n+```([a-zA-Z0-9.+-]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const path = m[1].trim().replace(/^\.?\//, "");
    if (!/^[\w@][\w@.\-/[\]]*\.\w{1,12}$/.test(path)) continue;
    files.push({ path, code: m[3], lang: m[2] });
  }
  return files;
}

export default function ArtifactsPanel({
  artifacts,
  onClose,
}: {
  artifacts: GeneratedArtifact[];
  onClose: () => void;
}) {
  const [selectedArtifact, setSelectedArtifact] = useState<GeneratedArtifact>(artifacts[0]);
  const [selectedFile, setSelectedFile] = useState<{ path: string; code: string; lang: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const files = selectedArtifact ? parseFiles(selectedArtifact.content) : [];
  const displayFile = selectedFile ?? (files[0] ?? null);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadAll() {
    const bundle = artifacts
      .map((a) => `<!-- ${a.title} -->\n\n${a.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([bundle], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pegasus-artifacts.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: "rgba(20,20,20,0.5)" }}
      onClick={onClose}
    >
      <div
        className="ml-auto w-full max-w-[900px] flex flex-col shadow-2xl"
        style={{ background: "var(--panel)", borderLeft: "1px solid var(--line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div className="flex items-center gap-2">
            <Icon name="code" size={14} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold">
              Generated artifacts ({artifacts.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadAll}
              className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
            >
              <Icon name="doc" size={11} strokeWidth={1.8} />
              Download all
            </button>
            <button
              onClick={onClose}
              className="text-xs px-2 py-1.5 rounded-lg"
              style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
            >
              <Icon name="close" size={11} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left: artifact + file list */}
          <div
            className="w-56 shrink-0 flex flex-col min-h-0"
            style={{ borderRight: "1px solid var(--line)" }}
          >
            {/* Artifacts */}
            <div
              className="px-3 pt-3 pb-1 shrink-0"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                Gaps closed
              </div>
              <div className="space-y-0.5 pb-3">
                {artifacts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedArtifact(a);
                      setSelectedFile(null);
                    }}
                    className="w-full text-left rounded-lg px-2 py-1.5 transition-colors"
                    style={{
                      background: selectedArtifact?.id === a.id ? "var(--panel-2)" : "transparent",
                      border: selectedArtifact?.id === a.id ? "1px solid var(--line)" : "1px solid transparent",
                    }}
                  >
                    <div className="text-[11px] font-medium truncate">{a.title}</div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: "var(--muted)" }}>
                      {timeAgo(a.createdAt)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Files in selected artifact */}
            <div className="flex-1 overflow-auto p-3">
              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                Files ({files.length})
              </div>
              <div className="space-y-0.5">
                {files.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => setSelectedFile(f)}
                    className="w-full text-left rounded-lg px-2 py-1.5 transition-colors"
                    style={{
                      background: displayFile?.path === f.path ? "var(--panel-2)" : "transparent",
                      border: displayFile?.path === f.path ? "1px solid var(--line)" : "1px solid transparent",
                    }}
                  >
                    <div className="text-[10px] font-mono truncate" title={f.path}>
                      {f.path.split("/").pop()}
                    </div>
                    <div className="text-[9px] font-mono truncate opacity-50">
                      {f.path.includes("/") ? f.path.split("/").slice(0, -1).join("/") + "/" : ""}
                    </div>
                  </button>
                ))}
                {files.length === 0 && (
                  <p className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>
                    No parsed files
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: code view */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {displayFile ? (
              <>
                <div
                  className="flex items-center justify-between px-4 py-2.5 shrink-0"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
                    {displayFile.path}
                  </span>
                  <button
                    onClick={() => copy(displayFile.code)}
                    className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                    style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
                  >
                    <Icon name="copy" size={10} strokeWidth={2} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <pre
                    className="text-[11.5px] leading-relaxed font-mono whitespace-pre-wrap break-words"
                    style={{ color: "var(--foreground)" }}
                  >
                    {displayFile.code}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-auto p-4">
                <pre
                  className="text-[11.5px] leading-relaxed font-mono whitespace-pre-wrap"
                  style={{ color: "var(--foreground)" }}
                >
                  {selectedArtifact?.content}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
