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
import ContextGraphPanel from "./ContextGraphPanel";
import LivePreview from "./LivePreview";
import { useToast } from "./Toast";
import Image from "next/image";
import { Icon } from "./icons";
import ThemeToggle from "./ThemeToggle";
import type { Blueprint, BoardItem, Gap, Project } from "@/lib/types";

type View = "board" | "blueprint";
type Tab = "gaps" | "summary" | "graph";
type SummarySection =
  | "overview"
  | "prd"
  | "flows"
  | "database"
  | "api"
  | "frontend"
  | "backend"
  | "infra"
  | "cicd"
  | "testing"
  | "deploy"
  | "memory";

function userApiHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const key = localStorage.getItem("pegasus_anthropic_key");
  const gkey = localStorage.getItem("pegasus_google_key");
  const gh = localStorage.getItem("pegasus_github_token");
  const headers: Record<string, string> = {};
  if (key)  headers["x-anthropic-key"] = key;
  if (gkey) headers["x-google-key"] = gkey;
  if (gh)   headers["x-github-token"] = gh;
  return headers;
}

function blueprintToMarkdown(name: string, bp: import("@/lib/types").Blueprint): string {
  const lines: string[] = [`# ${name} — Product Blueprint`, "", bp.summary, ""];

  if (bp.techStack.length) {
    lines.push("## Tech Stack", "", bp.techStack.map((t) => `- ${t}`).join("\n"), "");
  }

  if (bp.prd) {
    lines.push("## Product Requirements", "", `**Vision:** ${bp.prd.vision}`, "", `**Problem:** ${bp.prd.problemStatement}`, "");
    if (bp.prd.targetUsers.length) lines.push("**Target users:**", bp.prd.targetUsers.map((u) => `- ${u}`).join("\n"), "");
    if (bp.prd.coreFeatures.length) {
      lines.push("**Core features:**");
      bp.prd.coreFeatures.forEach((f) => lines.push(`- **${f.name}** *(${f.priority})*: ${f.description}`));
      lines.push("");
    }
    if (bp.prd.successMetrics.length) lines.push("**Success metrics:**", bp.prd.successMetrics.map((m) => `- ${m}`).join("\n"), "");
  }

  if (bp.userFlows?.length) {
    lines.push("## User Flows", "");
    bp.userFlows.forEach((flow) => {
      lines.push(`### ${flow.name}`, `*Actor: ${flow.actor}*`, "");
      flow.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
      lines.push("", `✓ ${flow.outcome}`, "");
    });
  }

  if (bp.databaseSchema) {
    lines.push("## Database Schema", "", `**Engine:** ${bp.databaseSchema.engine}`, "");
    bp.databaseSchema.entities.forEach((e) => {
      lines.push(`### ${e.name}`, "", "| Field | Type | Constraints |", "|-------|------|-------------|");
      e.fields.forEach((f) => lines.push(`| ${f.name} | \`${f.type}\` | ${f.constraints} |`));
      lines.push("");
    });
  }

  if (bp.apiArchitecture) {
    const api = bp.apiArchitecture;
    lines.push("## API Architecture", "", `**Style:** ${api.style} · **Auth:** ${api.authStrategy}`, "");
    lines.push("| Method | Path | Description | Auth |", "|--------|------|-------------|------|");
    api.endpoints.forEach((ep) => lines.push(`| ${ep.method} | \`${ep.path}\` | ${ep.description} | ${ep.auth ? "✓" : "—"} |`));
    lines.push("", `*Rate limiting:* ${api.rateLimitingNotes}`, "");
  }

  if (bp.frontendArchitecture) {
    const fe = bp.frontendArchitecture;
    lines.push("## Frontend Architecture", "", `- **Framework:** ${fe.framework}`, `- **State:** ${fe.stateManagement}`, `- **Routing:** ${fe.routing}`, `- **Design system:** ${fe.designSystem}`, "");
    if (fe.keyComponents.length) lines.push("**Key components:**", fe.keyComponents.map((c) => `- ${c}`).join("\n"), "");
  }

  if (bp.backendArchitecture) {
    const be = bp.backendArchitecture;
    lines.push("## Backend Architecture", "", `**Pattern:** ${be.pattern}`, "");
    be.services.forEach((s) => lines.push(`- **${s.name}** *(${s.tech})*: ${s.responsibility}`));
    lines.push("", `*Scaling:* ${be.scalingNotes}`, "");
  }

  if (bp.infrastructurePlan) {
    const inf = bp.infrastructurePlan;
    lines.push("## Infrastructure", "", `**Provider:** ${inf.provider} · **Est. cost:** ${inf.estimatedMonthlyCost}/mo`, "");
    inf.services.forEach((s) => lines.push(`- **${s.name}**: ${s.purpose}`));
    lines.push("", `*Scaling:* ${inf.scalingApproach}`, "");
  }

  if (bp.cicdPipeline) {
    const ci = bp.cicdPipeline;
    lines.push("## CI/CD Pipeline", "", `**Provider:** ${ci.provider} · **Strategy:** ${ci.deploymentStrategy}`, "", `**Stages:** ${ci.stages.join(" → ")}`, "", `**Environments:** ${ci.environments.join(", ")}`, "");
  }

  if (bp.testingStrategy) {
    const t = bp.testingStrategy;
    lines.push("## Testing Strategy", "", `**Unit:** ${t.unit}`, "", "**Integration:**", t.integrationScenarios.map((s) => `- ${s}`).join("\n"), "", "**E2E:**", t.e2eScenarios.map((s) => `- ${s}`).join("\n"), "", `**Performance targets:** ${t.performanceTargets}`, "");
  }

  if (bp.deploymentPlan) {
    const dp = bp.deploymentPlan;
    lines.push("## Deployment Plan", "");
    dp.environments.forEach((e) => lines.push(`### ${e.name}`, e.config, ""));
    lines.push(`**Rollout:** ${dp.rolloutStrategy}`, "", `**Monitoring:** ${dp.monitoring}`, "", `**Rollback:** ${dp.rollbackPlan}`, "");
  }

  if (bp.gaps.length) {
    lines.push("## Gaps & Recommendations", "");
    bp.gaps.forEach((g) => {
      lines.push(`### ${g.title}`, `*${g.severity.toUpperCase()} · ${g.category}*`, "", g.description, "", `**Recommendation:** ${g.recommendation}`, "");
    });
  }

  lines.push("---", "*Built with pegasus lab. — whiteboard in, working app out.*");
  return lines.join("\n");
}

function ShareButton({ projectId, existingShareId, onShared }: {
  projectId: string;
  existingShareId?: string;
  onShared: (shareId: string | null) => void;
}) {
  const [shareId, setShareId] = useState<string | undefined>(existingShareId);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function toggle() {
    setLoading(true);
    try {
      const enable = !shareId;
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable }),
      });
      const data = await res.json();
      const newId = data.shareId ?? null;
      setShareId(newId ?? undefined);
      onShared(newId);
      toast(enable ? "Share link created" : "Sharing disabled");
    } catch {
      toast("Failed to update share settings", "error");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!shareId) return;
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium">Share blueprint</div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>
            {shareId ? "Anyone with the link can view" : "Create a read-only link for stakeholders"}
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={loading}
          className="text-[10px] font-mono px-2.5 py-1 rounded-md transition-colors"
          style={{
            background: shareId ? "rgba(190,18,60,0.08)" : "rgba(89,224,200,0.08)",
            color: shareId ? "var(--bad)" : "var(--ok)",
            border: `1px solid ${shareId ? "rgba(190,18,60,0.2)" : "rgba(89,224,200,0.2)"}`,
          }}
        >
          {loading ? "…" : shareId ? "Disable" : "Enable"}
        </button>
      </div>
      {shareId && (
        <div className="flex items-center gap-1.5">
          <input
            readOnly
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareId}`}
            className="flex-1 text-[10px] font-mono rounded-md px-2 py-1 outline-none truncate"
            style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--muted)" }}
          />
          <button
            onClick={copyLink}
            className="text-[10px] font-mono px-2.5 py-1 rounded-md shrink-0 transition-colors"
            style={{
              background: copied ? "rgba(89,224,200,0.12)" : "var(--panel)",
              color: copied ? "var(--ok)" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Living blueprint: when a gap's code is generated, mark the gap resolved,
 * flip its related nodes to "existing", and promote any edge whose endpoints
 * are now both existing. Returns a new Blueprint (or null if none given).
 */
function resolveGapInBlueprint(bp: Blueprint | null, gap: Gap): Blueprint | null {
  if (!bp) return null;
  const related = new Set(gap.relatedNodeIds);
  const nodes = bp.nodes.map((n) =>
    related.has(n.id) ? { ...n, status: "existing" as const } : n
  );
  const existingIds = new Set(nodes.filter((n) => n.status === "existing").map((n) => n.id));
  const edges = bp.edges.map((e) =>
    existingIds.has(e.source) && existingIds.has(e.target)
      ? { ...e, status: "existing" as const }
      : e
  );
  const gaps = bp.gaps.map((g) => (g.id === gap.id ? { ...g, resolved: true } : g));
  return { ...bp, nodes, edges, gaps };
}

function SummaryBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-[11px] leading-relaxed">{children}</div>
    </div>
  );
}

export default function Workspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("board");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("gaps");
  const [summarySection, setSummarySection] = useState<SummarySection>("overview");
  const [selectedGap, setSelectedGap] = useState<Gap | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("idle");
  const [backend, setBackend] = useState<string | null>(null);

  const [codeOpen, setCodeOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [previewGap, setPreviewGap] = useState<Gap | null>(null);
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
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "Escape") {
        if (shortcutsOpen) { setShortcutsOpen(false); return; }
        if (previewGap) { setPreviewGap(null); return; }
        if (codeOpen) { abortRef.current?.abort(); setCodeOpen(false); return; }
        if (chatOpen) { setChatOpen(false); return; }
        if (shipOpen) { setShipOpen(false); return; }
        if (buildModalOpen) { setBuildModalOpen(false); return; }
        if (artifactsOpen) { setArtifactsOpen(false); return; }
      }
      if (mod && e.key === "b") { e.preventDefault(); if (!analyzing) setBuildModalOpen(true); }
      if (mod && e.key === "k") { e.preventDefault(); setChatOpen((v) => !v); }
      if (mod && e.key === "/") { e.preventDefault(); setView((v) => v === "board" ? "blueprint" : "board"); }
      if (mod && e.key === "`") { e.preventDefault(); if ((project?.generated?.length ?? 0) > 0) setArtifactsOpen((v) => !v); }
      if (mod && e.shiftKey && e.key === "?") { e.preventDefault(); setShortcutsOpen((v) => !v); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [codeOpen, chatOpen, shipOpen, buildModalOpen, artifactsOpen, shortcutsOpen, previewGap, analyzing, project]);

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
      const res = await fetch(`/api/projects/${projectId}/blueprint`, { method: "POST", headers: userApiHeaders() });
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
        headers: { "Content-Type": "application/json", ...userApiHeaders() },
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
        // Living blueprint — close the gap and flip its nodes to "existing".
        const closed = resolveGapInBlueprint(project?.blueprint ?? null, gap);
        setProject((p) => (p ? { ...p, generated, blueprint: closed ?? p.blueprint } : p));
        if (selectedGap?.id === gap.id) setSelectedGap(null);
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generated, ...(closed ? { blueprint: closed } : {}) }),
        }).catch(() => {});
        const openCount = closed ? closed.gaps.filter((g) => !g.resolved).length : 0;
        toast(`✓ "${gap.title}" closed — ${openCount} gap${openCount !== 1 ? "s" : ""} remaining`);
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
            backend === "demo" ? (
              <Link
                href="/settings"
                className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: "var(--warn)", background: "rgba(180,83,9,0.1)", border: "1px solid rgba(180,83,9,0.2)" }}
                title="Add your API key in Settings to enable real AI"
              >
                demo mode · add API key →
              </Link>
            ) : (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                style={{ color: "var(--ok)", background: "rgba(21,128,61,0.08)" }}
                title={`AI powered by ${backend}`}
              >
                {backend}
              </span>
            )
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
            onClick={() => setShortcutsOpen(true)}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-[11px] font-mono transition-colors hover:bg-[var(--panel-2)]"
            style={{ color: "var(--muted)", border: "1px solid var(--line)" }}
            title="Keyboard shortcuts (⌘⇧?)"
          >
            ?
          </button>
          <ThemeToggle />
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5"
            style={{
              border: "1px solid var(--line)",
              color: chatOpen ? "var(--accent)" : "var(--muted)",
              background: chatOpen ? "rgba(89,224,200,0.08)" : "transparent",
            }}
            title="Toggle chat (⌘K)"
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
            style={{ background: "var(--accent)", color: "var(--background)" }}
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
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 relative">
            <Board initialItems={project.items} onItemsChange={persistItems} />
          </div>
          {chatOpen && (
            <div className="w-[380px] shrink-0 flex flex-col min-h-0">
              <ChatPanel
                project={project}
                onClose={() => setChatOpen(false)}
                onRunBuild={() => { setChatOpen(false); build(); }}
              />
            </div>
          )}
        </div>
      ) : !bp ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="font-mono text-sm animate-pulse-soft" style={{ color: "var(--accent)" }}>
            Orchestrating context… understanding intent… generating Product Blueprint…
          </div>
          <p className="text-xs max-w-md" style={{ color: "var(--muted)" }}>
            Pegasus is absorbing everything on your board — requirements, designs, code, and docs —
            and producing a complete Product Blueprint: PRD, user flows, database schema, API and
            architecture plans, infrastructure, CI/CD, testing strategy, and deployment plan.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Blueprint canvas + gaps/summary panel */}
          <div className="flex-1 min-w-0 flex min-h-0">
            <BlueprintCanvas
              blueprint={bp}
              highlightIds={selectedGap ? selectedGap.relatedNodeIds : null}
              onNodeClick={() => setSelectedGap(null)}
            />
            <aside
              className="w-[360px] shrink-0 flex flex-col min-h-0"
              style={{ borderLeft: "1px solid var(--line)", background: "var(--panel)" }}
            >
            <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
              {(
                [
                  ["gaps", `Gaps (${bp.gaps.filter((g) => !g.resolved).length})`],
                  ["summary", "Summary"],
                  ["graph", "Graph"],
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
            <div className={`flex-1 min-h-0 ${tab === "graph" ? "overflow-hidden" : "overflow-auto p-3"}`}>
              {tab === "gaps" && (
                <GapPanel
                  gaps={bp.gaps}
                  selectedGapId={selectedGap?.id ?? null}
                  onSelect={setSelectedGap}
                  onGenerate={generateCode}
                  onPreview={setPreviewGap}
                  generatingGapId={generatingGapId}
                />
              )}
              {tab === "summary" && (
                <div className="space-y-2">
                  {/* Section nav */}
                  <div className="flex flex-wrap gap-1 pb-2" style={{ borderBottom: "1px solid var(--line)" }}>
                    {([
                      ["overview", "Overview"],
                      ["prd", "PRD"],
                      ["flows", "Flows"],
                      ["database", "DB"],
                      ["api", "API"],
                      ["frontend", "Frontend"],
                      ["backend", "Backend"],
                      ["infra", "Infra"],
                      ["cicd", "CI/CD"],
                      ["testing", "Testing"],
                      ["deploy", "Deploy"],
                      ["memory", "Memory"],
                    ] as [SummarySection, string][]).map(([s, label]) => {
                      const hasData = s === "overview" || s === "memory" ||
                        (s === "prd" && !!bp.prd) ||
                        (s === "flows" && !!bp.userFlows?.length) ||
                        (s === "database" && !!bp.databaseSchema) ||
                        (s === "api" && !!bp.apiArchitecture) ||
                        (s === "frontend" && !!bp.frontendArchitecture) ||
                        (s === "backend" && !!bp.backendArchitecture) ||
                        (s === "infra" && !!bp.infrastructurePlan) ||
                        (s === "cicd" && !!bp.cicdPipeline) ||
                        (s === "testing" && !!bp.testingStrategy) ||
                        (s === "deploy" && !!bp.deploymentPlan);
                      return (
                        <button
                          key={s}
                          onClick={() => setSummarySection(s)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded"
                          style={{
                            background: summarySection === s ? "var(--accent)" : hasData ? "var(--panel-2)" : "transparent",
                            color: summarySection === s ? "#fff" : hasData ? "var(--fg)" : "var(--muted)",
                            border: `1px solid ${summarySection === s ? "var(--accent)" : "var(--line)"}`,
                            opacity: hasData ? 1 : 0.4,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Overview */}
                  {summarySection === "overview" && (
                    <div className="space-y-3">
                      <p className="text-[12px] leading-relaxed">{bp.summary}</p>
                      <div className="flex flex-wrap gap-1">
                        {bp.techStack.map((t) => (
                          <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{t}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {(["existing", "partial", "missing"] as const).map((s) => (
                          <div key={s} className="rounded-lg py-2" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                            <div className="text-base font-semibold" style={{ color: s === "existing" ? "var(--ok)" : s === "partial" ? "var(--warn)" : "var(--bad)" }}>
                              {bp.nodes.filter((n) => n.status === s).length}
                            </div>
                            <div className="text-[9px] font-mono uppercase" style={{ color: "var(--muted)" }}>{s}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            const md = blueprintToMarkdown(project.name, bp);
                            const blob = new Blob([md], { type: "text/markdown" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}-blueprint.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast("Blueprint exported as Markdown");
                          }}
                          className="text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 flex-1 justify-center"
                          style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
                        >
                          <Icon name="doc" size={10} strokeWidth={1.8} />
                          Export Markdown
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(bp, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}-blueprint.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast("Blueprint exported as JSON");
                          }}
                          className="text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 flex-1 justify-center"
                          style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
                        >
                          <Icon name="code" size={10} strokeWidth={1.8} />
                          Export JSON
                        </button>
                      </div>
                      <ShareButton projectId={projectId} existingShareId={project.shareId} onShared={(id) => setProject((p) => p ? { ...p, shareId: id ?? undefined } : p)} />
                    </div>
                  )}

                  {/* PRD */}
                  {summarySection === "prd" && bp.prd && (
                    <div className="space-y-3">
                      <SummaryBlock label="Vision">{bp.prd.vision}</SummaryBlock>
                      <SummaryBlock label="Problem">{bp.prd.problemStatement}</SummaryBlock>
                      <SummaryBlock label="Target users">
                        <ul className="space-y-0.5">{bp.prd.targetUsers.map((u, i) => <li key={i} className="text-[11px]">· {u}</li>)}</ul>
                      </SummaryBlock>
                      <SummaryBlock label="Core features">
                        {bp.prd.coreFeatures.map((f, i) => (
                          <div key={i} className="mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono px-1 py-0.5 rounded" style={{ background: f.priority === "must-have" ? "rgba(37,99,235,0.1)" : "var(--panel-2)", color: f.priority === "must-have" ? "var(--accent)" : "var(--muted)", border: "1px solid var(--line)" }}>{f.priority}</span>
                              <span className="text-[11px] font-medium">{f.name}</span>
                            </div>
                            <p className="text-[11px] ml-1 mt-0.5" style={{ color: "var(--muted)" }}>{f.description}</p>
                          </div>
                        ))}
                      </SummaryBlock>
                      <SummaryBlock label="Non-goals">
                        <ul className="space-y-0.5">{bp.prd.nonGoals.map((g, i) => <li key={i} className="text-[11px]">· {g}</li>)}</ul>
                      </SummaryBlock>
                      <SummaryBlock label="Success metrics">
                        <ul className="space-y-0.5">{bp.prd.successMetrics.map((m, i) => <li key={i} className="text-[11px]">· {m}</li>)}</ul>
                      </SummaryBlock>
                    </div>
                  )}

                  {/* User flows */}
                  {summarySection === "flows" && bp.userFlows && (
                    <div className="space-y-4">
                      {bp.userFlows.map((flow) => (
                        <div key={flow.id} className="rounded-lg p-3 space-y-1.5" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-semibold">{flow.name}</span>
                            <span className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>{flow.actor}</span>
                          </div>
                          <ol className="space-y-1">
                            {flow.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[11px]">
                                <span className="font-mono text-[9px] mt-0.5 shrink-0" style={{ color: "var(--muted)" }}>{i + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                          <p className="text-[10px] font-mono pt-1" style={{ color: "var(--ok)" }}>→ {flow.outcome}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Database schema */}
                  {summarySection === "database" && bp.databaseSchema && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono px-2 py-1 rounded inline-block" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{bp.databaseSchema.engine}</div>
                      {bp.databaseSchema.entities.map((entity) => (
                        <div key={entity.name} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                          <div className="px-3 py-1.5 text-[11px] font-semibold font-mono" style={{ background: "var(--panel-2)", borderBottom: "1px solid var(--line)" }}>{entity.name}</div>
                          <table className="w-full text-[10px]">
                            <tbody>
                              {entity.fields.map((f) => (
                                <tr key={f.name} style={{ borderBottom: "1px solid var(--line)" }}>
                                  <td className="px-3 py-1 font-mono" style={{ color: "var(--fg)" }}>{f.name}</td>
                                  <td className="px-3 py-1 font-mono" style={{ color: "var(--accent)" }}>{f.type}</td>
                                  <td className="px-3 py-1" style={{ color: "var(--muted)" }}>{f.constraints}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                      {bp.databaseSchema.relationships.length > 0 && (
                        <SummaryBlock label="Relationships">
                          {bp.databaseSchema.relationships.map((r, i) => (
                            <div key={i} className="text-[11px] font-mono">{r.from} <span style={{ color: "var(--muted)" }}>→{r.via ? ` via ${r.via} →` : ""}</span> {r.to} <span style={{ color: "var(--muted)" }}>({r.type})</span></div>
                          ))}
                        </SummaryBlock>
                      )}
                    </div>
                  )}

                  {/* API architecture */}
                  {summarySection === "api" && bp.apiArchitecture && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{bp.apiArchitecture.style}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{bp.apiArchitecture.authStrategy}</span>
                      </div>
                      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                        {bp.apiArchitecture.endpoints.map((ep, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono" style={{ borderBottom: i < bp.apiArchitecture!.endpoints.length - 1 ? "1px solid var(--line)" : undefined, background: i % 2 === 0 ? "transparent" : "var(--panel-2)" }}>
                            <span style={{ color: ep.method === "GET" ? "var(--ok)" : ep.method === "DELETE" ? "var(--bad)" : "var(--warn)", minWidth: 44 }}>{ep.method}</span>
                            <span className="flex-1 truncate">{ep.path}</span>
                            {ep.auth && <span style={{ color: "var(--muted)" }}>🔒</span>}
                          </div>
                        ))}
                      </div>
                      <SummaryBlock label="Rate limiting">{bp.apiArchitecture.rateLimitingNotes}</SummaryBlock>
                    </div>
                  )}

                  {/* Frontend architecture */}
                  {summarySection === "frontend" && bp.frontendArchitecture && (
                    <div className="space-y-3">
                      {[
                        ["Framework", bp.frontendArchitecture.framework],
                        ["State", bp.frontendArchitecture.stateManagement],
                        ["Routing", bp.frontendArchitecture.routing],
                        ["Design system", bp.frontendArchitecture.designSystem],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div className="text-[9px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "var(--muted)" }}>{label}</div>
                          <div className="text-[12px]">{val}</div>
                        </div>
                      ))}
                      <SummaryBlock label="Key components">
                        <div className="flex flex-wrap gap-1">
                          {bp.frontendArchitecture.keyComponents.map((c, i) => (
                            <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{c}</span>
                          ))}
                        </div>
                      </SummaryBlock>
                    </div>
                  )}

                  {/* Backend architecture */}
                  {summarySection === "backend" && bp.backendArchitecture && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded inline-block" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{bp.backendArchitecture.pattern}</span>
                      {bp.backendArchitecture.services.map((s, i) => (
                        <div key={i} className="rounded-lg p-3" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                          <div className="text-[11px] font-semibold mb-0.5">{s.name}</div>
                          <div className="text-[11px]" style={{ color: "var(--muted)" }}>{s.responsibility}</div>
                          <div className="text-[10px] font-mono mt-1" style={{ color: "var(--accent)" }}>{s.tech}</div>
                        </div>
                      ))}
                      <SummaryBlock label="Scaling">{bp.backendArchitecture.scalingNotes}</SummaryBlock>
                    </div>
                  )}

                  {/* Infrastructure */}
                  {summarySection === "infra" && bp.infrastructurePlan && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>{bp.infrastructurePlan.provider}</span>
                        <span className="text-[11px] font-semibold">{bp.infrastructurePlan.estimatedMonthlyCost}/mo</span>
                      </div>
                      {bp.infrastructurePlan.services.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[10px] font-mono mt-0.5" style={{ color: "var(--muted)" }}>·</span>
                          <div>
                            <span className="text-[11px] font-medium">{s.name}</span>
                            <span className="text-[11px]" style={{ color: "var(--muted)" }}> — {s.purpose}</span>
                          </div>
                        </div>
                      ))}
                      <SummaryBlock label="Scaling">{bp.infrastructurePlan.scalingApproach}</SummaryBlock>
                    </div>
                  )}

                  {/* CI/CD */}
                  {summarySection === "cicd" && bp.cicdPipeline && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{bp.cicdPipeline.provider}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{bp.cicdPipeline.deploymentStrategy}</span>
                      </div>
                      <SummaryBlock label="Environments">
                        <div className="flex gap-1.5 flex-wrap">
                          {bp.cicdPipeline.environments.map((e, i) => (
                            <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{e}</span>
                          ))}
                        </div>
                      </SummaryBlock>
                      <SummaryBlock label="Pipeline stages">
                        <div className="flex items-center gap-1 flex-wrap">
                          {bp.cicdPipeline.stages.map((s, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>{s}</span>
                              {i < bp.cicdPipeline!.stages.length - 1 && <span style={{ color: "var(--muted)" }}>→</span>}
                            </span>
                          ))}
                        </div>
                      </SummaryBlock>
                    </div>
                  )}

                  {/* Testing */}
                  {summarySection === "testing" && bp.testingStrategy && (
                    <div className="space-y-3">
                      <SummaryBlock label="Unit tests">{bp.testingStrategy.unit}</SummaryBlock>
                      <SummaryBlock label="Integration scenarios">
                        <ul className="space-y-0.5">{bp.testingStrategy.integrationScenarios.map((s, i) => <li key={i} className="text-[11px]">· {s}</li>)}</ul>
                      </SummaryBlock>
                      <SummaryBlock label="E2E scenarios">
                        <ul className="space-y-0.5">{bp.testingStrategy.e2eScenarios.map((s, i) => <li key={i} className="text-[11px]">· {s}</li>)}</ul>
                      </SummaryBlock>
                      <SummaryBlock label="Performance targets">{bp.testingStrategy.performanceTargets}</SummaryBlock>
                    </div>
                  )}

                  {/* Deployment plan */}
                  {summarySection === "deploy" && bp.deploymentPlan && (
                    <div className="space-y-3">
                      {bp.deploymentPlan.environments.map((env, i) => (
                        <div key={i} className="rounded-lg p-3" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                          <div className="text-[11px] font-semibold mb-0.5 font-mono">{env.name}</div>
                          <div className="text-[11px]" style={{ color: "var(--muted)" }}>{env.config}</div>
                        </div>
                      ))}
                      <SummaryBlock label="Rollout">{bp.deploymentPlan.rolloutStrategy}</SummaryBlock>
                      <SummaryBlock label="Monitoring">{bp.deploymentPlan.monitoring}</SummaryBlock>
                      <SummaryBlock label="Rollback">{bp.deploymentPlan.rollbackPlan}</SummaryBlock>
                    </div>
                  )}

                  {/* Project Memory */}
                  {summarySection === "memory" && (
                    <div className="space-y-3">
                      {bp.memory ? (
                        <>
                          <SummaryBlock label="Core purpose">{bp.memory.corePurpose}</SummaryBlock>
                          <SummaryBlock label="Target users">
                            <ul className="space-y-0.5">{bp.memory.targetUsers.map((u, i) => <li key={i} className="text-[11px]">· {u}</li>)}</ul>
                          </SummaryBlock>
                          <SummaryBlock label="Key constraints">
                            <ul className="space-y-0.5">{bp.memory.keyConstraints.map((c, i) => <li key={i} className="text-[11px]">· {c}</li>)}</ul>
                          </SummaryBlock>
                          <SummaryBlock label="Technical decisions">
                            {bp.memory.technicalDecisions.map((d, i) => (
                              <div key={i} className="mb-2">
                                <div className="text-[11px] font-semibold">{d.topic}</div>
                                <div className="text-[11px]">{d.decision}</div>
                                <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{d.rationale}</div>
                              </div>
                            ))}
                          </SummaryBlock>
                          {bp.memory.openQuestions.length > 0 && (
                            <SummaryBlock label="Open questions">
                              <ul className="space-y-0.5">{bp.memory.openQuestions.map((q, i) => <li key={i} className="text-[11px]">? {q}</li>)}</ul>
                            </SummaryBlock>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px]" style={{ color: "var(--muted)" }}>Project memory will be populated after blueprint generation.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {tab === "graph" && (
                <ContextGraphPanel graph={bp.contextGraph ?? { nodes: [], links: [] }} />
              )}
            </div>
            </aside>
          </div>

          {/* Integrated Cursor-style chat panel */}
          {chatOpen && (
            <div className="w-[380px] shrink-0 flex flex-col min-h-0">
              <ChatPanel
                project={project}
                onClose={() => setChatOpen(false)}
                onRunBuild={() => { setChatOpen(false); build(); }}
              />
            </div>
          )}
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

      {previewGap && (
        <LivePreview
          projectId={projectId}
          gap={previewGap}
          onClose={() => setPreviewGap(null)}
        />
      )}

      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
              <span className="text-[12px] font-semibold">Keyboard shortcuts</span>
              <button onClick={() => setShortcutsOpen(false)} style={{ color: "var(--muted)" }}>
                <Icon name="close" size={12} strokeWidth={2} />
              </button>
            </div>
            <div className="p-3 space-y-0.5">
              {([
                ["⌘B", "Build / rebuild app"],
                ["⌘K", "Toggle chat"],
                ["⌘/", "Toggle board ↔ blueprint"],
                ["⌘`", "Open artifacts"],
                ["Esc", "Close any panel"],
                ["⌘⇧?", "This help"],
              ] as [string, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: "var(--panel-2)" }}>
                  <span className="text-[11px]" style={{ color: "var(--foreground)" }}>{label}</span>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--background)", border: "1px solid var(--line)", color: "var(--muted)" }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
