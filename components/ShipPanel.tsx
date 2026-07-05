"use client";

import { useState } from "react";
import { Icon } from "./icons";
import type { Project } from "@/lib/types";

type ShipWhat = "site" | "artifacts";

export default function ShipPanel({
  project,
  onClose,
  onShipped,
  initialMode,
}: {
  project: Project;
  onClose: () => void;
  onShipped?: () => void;
  initialMode?: ShipWhat;
}) {
  const artifacts = project.generated ?? [];
  const siteFiles = project.site?.files ?? [];
  const hasSite = siteFiles.length > 0;
  const hasArtifacts = artifacts.length > 0;

  const [what, setWhat] = useState<ShipWhat>(
    initialMode ?? (hasSite ? "site" : "artifacts")
  );
  const [repo, setRepo] = useState(
    project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  );
  const [token, setToken] = useState("");
  const [shipping, setShipping] = useState(false);
  const [result, setResult] = useState<{ url: string; files: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shippable = what === "site" ? hasSite : hasArtifacts;

  async function ship() {
    setShipping(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, token: token || undefined, what }),
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ background: "rgba(20,20,20,0.4)" }}>
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
              {what === "site" && (
                <p className="text-[11px] mt-3" style={{ color: "var(--ink-muted)" }}>
                  Deploy it: import this repo at vercel.com/new — it&apos;s a standard Vite app.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* What to ship */}
              {hasSite && hasArtifacts && (
                <div
                  className="flex rounded-xl p-0.5 text-[12px] font-medium"
                  style={{ background: "var(--paper)", border: "1px solid var(--hairline)" }}
                >
                  {(["site", "artifacts"] as ShipWhat[]).map((w) => (
                    <button
                      key={w}
                      onClick={() => setWhat(w)}
                      className="flex-1 rounded-[10px] py-1.5 transition-colors"
                      style={{
                        background: what === w ? "#111" : "transparent",
                        color: what === w ? "#fff" : "var(--ink-muted)",
                      }}
                    >
                      {w === "site" ? "Website" : "Gap artifacts"}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                {what === "site"
                  ? `Pushes the complete generated website for ${project.name} — a runnable Vite + React repo with README — to GitHub. Import it on Vercel to deploy.`
                  : `Pushes everything Pegasus generated for ${project.name} — plus a PEGASUS.md build manifest — to a GitHub repository.`}
              </p>

              <div
                className="rounded-xl border px-3 py-2 max-h-28 overflow-auto"
                style={{ borderColor: "var(--hairline)" }}
              >
                {what === "site" ? (
                  hasSite ? (
                    siteFiles.map((f) => (
                      <div key={f.path} className="flex items-center gap-2 py-0.5">
                        <Icon name="code" size={10} strokeWidth={2} style={{ color: "var(--ink-muted)" }} />
                        <span className="text-[11px] font-mono truncate">{f.path}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                      No website yet — click Build website first.
                    </p>
                  )
                ) : hasArtifacts ? (
                  artifacts.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 py-0.5">
                      <Icon name="code" size={10} strokeWidth={2} style={{ color: "var(--ink-muted)" }} />
                      <span className="text-[11px] truncate">{a.title}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    Nothing generated yet — close a gap first, then ship.
                  </p>
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
                  disabled={shipping || !shippable || !repo.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-xl py-2.5 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {shipping ? "Shipping..." : "Push to GitHub"}
                  {!shipping && <Icon name="arrow-right" size={12} strokeWidth={2.2} />}
                </button>
                {what === "artifacts" && (
                  <button
                    onClick={downloadBundle}
                    disabled={!hasArtifacts}
                    className="text-[13px] font-medium rounded-xl py-2.5 px-4 border disabled:opacity-40"
                    style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
                    title="Download everything as a markdown bundle"
                  >
                    Download
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
