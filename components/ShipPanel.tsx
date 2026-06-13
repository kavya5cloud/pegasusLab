"use client";

import { useState } from "react";
import { Icon } from "./icons";
import type { Project } from "@/lib/types";

export default function ShipPanel({
  project,
  onClose,
  onShipped,
}: {
  project: Project;
  onClose: () => void;
  onShipped?: () => void;
}) {
  const artifacts = project.generated ?? [];
  const [repo, setRepo] = useState(
    project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  );
  const [token, setToken] = useState("");
  const [shipping, setShipping] = useState(false);
  const [result, setResult] = useState<{ url: string; files: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ship() {
    setShipping(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, token: token || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ship failed");
      setResult(data);
      onShipped?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ship failed");
    } finally {
      setShipping(false);
    }
  }

  function downloadBundle() {
    const bundle = artifacts
      .map((a) => `<!-- ${a.title} (${a.createdAt}) -->\n\n${a.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([bundle], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${repo || "pegasus-build"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(20,20,20,0.4)" }}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border overflow-hidden"
        style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <div className="flex items-center gap-2">
            <Icon name="github" size={16} strokeWidth={1.8} />
            <h3 className="text-sm font-semibold">Ship this build</h3>
          </div>
          <button onClick={onClose} style={{ color: "var(--ink-muted)" }} title="Close">
            <Icon name="close" size={13} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {result ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-3" style={{ color: "#15803d" }}>
                <Icon name="check" size={28} strokeWidth={2.2} />
              </div>
              <p className="text-sm font-medium mb-1">
                Shipped {result.files.length} file{result.files.length === 1 ? "" : "s"}.
              </p>
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] underline text-blue-600 break-all"
              >
                {result.url}
              </a>
            </div>
          ) : (
            <>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                Pushes everything Pegasus generated for {project.name} — plus a
                PEGASUS.md build manifest — to a GitHub repository.
              </p>

              <div
                className="rounded-xl border px-3 py-2 max-h-28 overflow-auto"
                style={{ borderColor: "var(--hairline)" }}
              >
                {artifacts.length === 0 ? (
                  <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    Nothing generated yet — close a gap first, then ship.
                  </p>
                ) : (
                  artifacts.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 py-0.5">
                      <Icon name="code" size={10} strokeWidth={2} style={{ color: "var(--ink-muted)" }} />
                      <span className="text-[11px] truncate">{a.title}</span>
                    </div>
                  ))
                )}
              </div>

              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="repository-name"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:border-blue-500 font-mono"
                style={{ borderColor: "var(--hairline)" }}
              />
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                placeholder="GitHub token (repo scope) — or set GITHUB_TOKEN"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:border-blue-500 font-mono"
                style={{ borderColor: "var(--hairline)" }}
              />

              {error && (
                <p className="text-[12px]" style={{ color: "#be123c" }}>
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={ship}
                  disabled={shipping || artifacts.length === 0 || !repo.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-xl py-2.5 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {shipping ? "Shipping..." : "Push to GitHub"}
                  {!shipping && <Icon name="arrow-right" size={12} strokeWidth={2.2} />}
                </button>
                <button
                  onClick={downloadBundle}
                  disabled={artifacts.length === 0}
                  className="text-[13px] font-medium rounded-xl py-2.5 px-4 border disabled:opacity-40"
                  style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
                  title="Download everything as a markdown bundle"
                >
                  Download
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
