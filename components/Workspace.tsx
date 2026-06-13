"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Board from "./Board";
import BlueprintCanvas from "./BlueprintCanvas";
import GapPanel from "./GapPanel";
import CodePanel from "./CodePanel";
import ShipPanel from "./ShipPanel";
import BuildModal from "./BuildModal";
import ChatPanel from "./ChatPanel";
import ArtifactsPanel from "./ArtifactsPanel";
import { useToast } from "./Toast";
import Image from "next/image";
import { Icon } from "./icons";
import type { BoardItem, Gap, Project } from "@/lib/types";

type View = "board" | "blueprint";
type Tab = "gaps" | "summary";

export default function Workspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("board");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("gaps");
  const [selectedGap, setSelectedGap] = useState<Gap | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("idle");
  const [backend, setBackend] = useState<string | null>(null);

  const [codeOpen, setCodeOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const { toast } = useToast();
  const [codeTitle, setCodeTitle] = useState("");
  const [codeContent, setCodeContent] = useState("");
  const [generatingGapId, setGeneratingGapId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const itemsRef = useRef<BoardItem[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/status").then(r => r.json()).then(d => setBackend(d.backend)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(async (res) => {
        if (res.ok) {
          const p: Project = await res.json();
          setProject(p);
          itemsRef.current = p.items;
          if (p.blueprint) setView("blueprint");
          document.title = `${p.name} — pegasus lab.`;
        }
      })
      .finally(() => setLoading(false));
    return () => { document.title = "pegasus lab. — the intelligence layer between ideas and software"; };
  }, [projectId]);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (codeOpen) { abortRef.current?.abort(); setCodeOpen(false); return; }
        if (chatOpen) { setChatOpen(false); return; }
        if (shipOpen) { setShipOpen(false); return; }
        if (buildModalOpen) { setBuildModalOpen(false); return; }
        if (artifactsOpen) { setArtifactsOpen(false); return; }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        if (!analyzing) setBuildModalOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [codeOpen, chatOpen, shipOpen, buildModalOpen, artifactsOpen, analyzing]);

  const persistItems = useCallback(
    (items: BoardItem[]) => {
      itemsRef.current = items;
      // Keep project state in sync so Board remounts (view switches) don't
      // roll the board back to stale items.
      setProject((p) => (p ? { ...p, items } : p));
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsRef.current }),
        }).catch(() => {});
        setSaveState("saved");
      }, 800);
    },
    [projectId]
  );

  async function build() {
    // Flush any pending board save before analyzing.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: itemsRef.current }),
    }).catch(() => {});

    setAnalyzing(true);
    setError(null);
    setView("blueprint");
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprint`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Blueprint generation failed");
      setProject(data);
      itemsRef.current = data.items;
      setSelectedGap(null);
      toast(`Blueprint ready — ${data.blueprint?.gaps?.length ?? 0} gaps found`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Blueprint generation failed");
      toast(e instanceof Error ? e.message : "Blueprint generation failed", "error");
      setView("board");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generateCode(gap: Gap) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGeneratingGapId(gap.id);
    setCodeTitle(gap.title);
    setCodeContent("");
    setCodeOpen(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gapId: gap.id }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Generation failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setCodeContent((prev) => prev + chunk);
      }
      // Keep the artifact so the build can be shipped to a repo.
      if (full.trim()) {
        const artifact = {
          id: crypto.randomUUID().slice(0, 8),
          gapId: gap.id,
          title: gap.title,
          content: full,
          createdAt: new Date().toISOString(),
        };
        const generated = [
          ...(project?.generated ?? []).filter((a) => a.gapId !== gap.id),
          artifact,
        ];
        setProject((p) => (p ? { ...p, generated } : p));
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generated }),
        }).catch(() => {});
        toast(`Code generated for "${gap.title}"`);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setCodeContent((prev) => prev + `\n\n[Error: ${e instanceof Error ? e.message : "unknown"}]`);
      }
    } finally {
      setGeneratingGapId(null);
    }
  }

  if (loading) {
    return (
      <main className="workspace flex-1 flex items-center justify-center h-screen">
        <span className="font-mono text-sm animate-pulse-soft" style={{ color: "var(--muted)" }}>
          Loading workspace…
        </span>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="workspace flex-1 flex flex-col items-center justify-center gap-4 h-screen">
        <p style={{ color: "var(--muted)" }}>Project not found.</p>
        <Link href="/projects" className="text-sm" style={{ color: "var(--accent)" }}>
          Back to projects
        </Link>
      </main>
    );
  }

  const bp = project.blueprint;

  return (
    <main className="workspace flex-1 flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-2.5 shrink-0 gap-4"
        style={{ borderBottom: "1px solid var(--line)", background: "var(--panel)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/projects" className="flex items-center shrink-0">
            <Image
              src="/pegasuslogo.png"
              alt="pegasus lab."
              width={88}
              height={74}
              className="h-12 w-auto -my-3"
              priority
            />
          </Link>
          <span style={{ color: "var(--line)" }}>/</span>
          <h1 className="text-sm font-medium truncate" title={project.name}>{project.name}</h1>
          {backend && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
              style={{
                color: backend === "demo" ? "var(--warn)" : "var(--ok)",
                background: backend === "demo" ? "rgba(180,83,9,0.1)" : "rgba(21,128,61,0.08)",
              }}
              title={backend === "demo" ? "Set an API key in .env.local for real AI analysis" : `AI powered by ${backend}`}
            >
              {backend === "demo" ? "demo mode" : backend}
            </span>
          )}
          <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--muted)" }}>
            {saveState === "saving" ? "saving…" : saveState === "saved" ? "saved" : ""}
          </span>
        </div>

        {/* View switch */}
        <div
          className="flex rounded-lg p-0.5 shrink-0"
          style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
        >
          {(
            [
              ["board", "Board"],
              ["blueprint", "Blueprint"],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              disabled={v === "blueprint" && !bp && !analyzing}
              className="text-xs font-medium px-3 py-1 rounded-md disabled:opacity-30"
              style={{
                background: view === v ? "var(--panel)" : "transparent",
                color: view === v ? "var(--accent)" : "var(--muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setChatOpen(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
            title="Chat with Pegasus about this build"
          >
            <Icon name="idea" size={11} strokeWidth={1.8} />
            Chat
          </button>
          {(project.generated?.length ?? 0) > 0 && (
            <>
              <button
                onClick={() => setArtifactsOpen(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5"
                style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
                title="View all generated artifacts"
              >
                <Icon name="code" size={11} strokeWidth={2} />
                {project.generated!.length} artifact{project.generated!.length !== 1 ? "s" : ""}
              </button>
              <button
                onClick={() => setShipOpen(true)}
                className="text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5"
                style={{ background: "#2563eb", color: "#ffffff" }}
              >
                <Icon name="github" size={11} strokeWidth={2} />
                Ship
              </button>
            </>
          )}
          <button
            onClick={() => setBuildModalOpen(true)}
            disabled={analyzing}
            className="text-xs font-semibold px-4 py-1.5 rounded-full disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#ffffff" }}
            title="Build app (⌘B)"
          >
            {analyzing ? "Building…" : bp ? "Rebuild app" : "Build app"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="px-5 py-2 text-xs shrink-0"
          style={{ background: "rgba(190,18,60,0.08)", color: "var(--bad)" }}
        >
          {error}
        </div>
      )}

      {/* Body */}
      {view === "board" ? (
        <div className="flex-1 min-h-0 relative">
          <Board initialItems={project.items} onItemsChange={persistItems} />
        </div>
      ) : !bp ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="font-mono text-sm animate-pulse-soft" style={{ color: "var(--accent)" }}>
            Reading the board… mapping components… tracing connections… finding gaps…
          </div>
          <p className="text-xs max-w-md" style={{ color: "var(--muted)" }}>
            Pegasus is turning your whiteboard into a living blueprint of {project.name} — every
            page, API, service, table, and the connections between them.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0">
            <BlueprintCanvas
              blueprint={bp}
              highlightIds={selectedGap ? selectedGap.relatedNodeIds : null}
              onNodeClick={() => setSelectedGap(null)}
            />
          </div>

          <aside
            className="w-[360px] shrink-0 flex flex-col min-h-0"
            style={{ borderLeft: "1px solid var(--line)", background: "var(--panel)" }}
          >
            <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
              {(
                [
                  ["gaps", `Gaps (${bp.gaps.length})`],
                  ["summary", "Summary"],
                ] as [Tab, string][]
              ).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 text-xs font-medium py-2.5"
                  style={{
                    color: tab === t ? "var(--accent)" : "var(--muted)",
                    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-3">
              {tab === "gaps" && (
                <GapPanel
                  gaps={bp.gaps}
                  selectedGapId={selectedGap?.id ?? null}
                  onSelect={setSelectedGap}
                  onGenerate={generateCode}
                  generatingGapId={generatingGapId}
                />
              )}
              {tab === "summary" && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed">{bp.summary}</p>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(bp, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}-blueprint.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast("Blueprint exported");
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-full justify-center"
                    style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
                  >
                    <Icon name="doc" size={11} strokeWidth={1.8} />
                    Export blueprint JSON
                  </button>
                  <div>
                    <h4
                      className="text-[10px] font-mono uppercase tracking-wider mb-2"
                      style={{ color: "var(--muted)" }}
                    >
                      Tech stack
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {bp.techStack.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] font-mono px-2 py-0.5 rounded"
                          style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {(
                      [
                        ["existing", "var(--ok)"],
                        ["partial", "var(--warn)"],
                        ["missing", "var(--bad)"],
                      ] as const
                    ).map(([status, color]) => (
                      <div
                        key={status}
                        className="rounded-lg py-2"
                        style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
                      >
                        <div className="text-lg font-semibold" style={{ color }}>
                          {bp.nodes.filter((n) => n.status === status).length}
                        </div>
                        <div className="text-[10px] font-mono uppercase" style={{ color: "var(--muted)" }}>
                          {status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {buildModalOpen && (
        <BuildModal
          rebuild={!!bp}
          onClose={() => setBuildModalOpen(false)}
          onBlueprint={() => {
            setBuildModalOpen(false);
            build();
          }}
          onChat={() => {
            setBuildModalOpen(false);
            setChatOpen(true);
          }}
        />
      )}

      {chatOpen && (
        <ChatPanel
          project={project}
          onClose={() => setChatOpen(false)}
          onRunBuild={() => {
            setChatOpen(false);
            build();
          }}
        />
      )}

      {shipOpen && <ShipPanel project={project} onClose={() => setShipOpen(false)} onShipped={() => toast("Build shipped to GitHub!")} />}
      {artifactsOpen && (project.generated?.length ?? 0) > 0 && (
        <ArtifactsPanel artifacts={project.generated!} onClose={() => setArtifactsOpen(false)} />
      )}

      {codeOpen && (
        <CodePanel
          title={codeTitle}
          content={codeContent}
          streaming={generatingGapId !== null}
          onClose={() => {
            abortRef.current?.abort();
            setCodeOpen(false);
          }}
        />
      )}
    </main>
  );
}
