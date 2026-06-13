"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { signOut as oauthSignOut } from "next-auth/react";
import { getUser, signOut, type SessionUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { GapSeverity, Project } from "@/lib/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const SEVERITY_COLOR: Record<GapSeverity, string> = {
  critical: "#be123c",
  high: "#c2410c",
  medium: "#b45309",
  low: "#6b6963",
};

const SEVERITY_ORDER: GapSeverity[] = ["critical", "high", "medium", "low"];

function StatusBar({ project }: { project: Project }) {
  const bp = project.blueprint;
  if (!bp || bp.nodes.length === 0) {
    return <div className="h-1 rounded-full" style={{ background: "var(--hairline)" }} />;
  }
  const total = bp.nodes.length;
  const pct = (s: string) => (bp.nodes.filter((n) => n.status === s).length / total) * 100;
  return (
    <div
      className="h-1 rounded-full overflow-hidden flex"
      style={{ background: "var(--hairline)" }}
      title="existing / partial / missing"
    >
      <span style={{ width: `${pct("existing")}%`, background: "#15803d" }} />
      <span style={{ width: `${pct("partial")}%`, background: "#b45309" }} />
      <span style={{ width: `${pct("missing")}%`, background: "#be123c" }} />
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const promptRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/auth?next=%2Fprojects");
      return;
    }
    setUser(u);
    load();
    // A prompt typed on the landing page rides along through sign-in.
    const carried = new URLSearchParams(window.location.search).get("prompt");
    if (carried) {
      setPrompt(carried);
      setTimeout(() => promptRef.current?.focus(), 100);
    }
  }, [router, load]);

  async function quickStart(e: React.FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || creating) return;
    setCreating(true);
    try {
      const words = text.split(/\s+/).slice(0, 4).join(" ");
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: words.charAt(0).toUpperCase() + words.slice(1),
          description: text,
          items: [
            {
              id: crypto.randomUUID().slice(0, 8),
              kind: "idea",
              title: "The idea",
              content: text,
              x: 0,
              y: 0,
            },
          ],
        }),
      });
      const project = await res.json();
      router.push(`/project/${project.id}`);
    } catch {
      setCreating(false);
    }
  }

  async function loadSample() {
    if (seeding) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/sample", { method: "POST" });
      const project = await res.json();
      router.push(`/project/${project.id}`);
    } catch {
      setSeeding(false);
    }
  }

  async function remove(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
    toast("Build deleted");
    load();
  }

  async function renameProject(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    }).catch(() => {});
    setRenamingId(null);
    toast("Build renamed");
    load();
  }

  if (!user) {
    return <main className="flex-1 min-h-screen" style={{ background: "var(--paper)" }} />;
  }

  const blueprintsReady = projects.filter((p) => p.blueprint).length;
  const openGaps = projects.reduce((n, p) => n + (p.blueprint?.gaps.length ?? 0), 0);
  const generated = projects.reduce((n, p) => n + (p.generated?.length ?? 0), 0);

  const stats: [string, number, string][] = [
    ["Builds", projects.length, "board"],
    ["Blueprints ready", blueprintsReady, "blueprint"],
    ["Open gaps", openGaps, "bolt"],
    ["Generated artifacts", generated, "code"],
  ];

  // Highest-severity open gaps across every build.
  const topGaps = projects
    .flatMap((p) => (p.blueprint?.gaps ?? []).map((g) => ({ project: p, gap: g })))
    .sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.gap.severity) - SEVERITY_ORDER.indexOf(b.gap.severity)
    )
    .slice(0, 4);

  return (
    <main
      className="flex-1 min-h-screen flex flex-col"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      {/* Pill nav */}
      <nav className="flex items-center justify-center pt-8">
        <div
          className="flex items-center gap-6 bg-white rounded-full pl-3 pr-2 py-1.5 shadow-sm border"
          style={{ borderColor: "var(--hairline)" }}
        >
          <Link href="/" className="flex items-center">
            <Image
              src="/pegasuslogo.png"
              alt="pegasus lab."
              width={76}
              height={64}
              className="h-10 w-auto -my-2"
              priority
            />
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-[12px]" style={{ color: "var(--ink-muted)" }}>
            <Link href="/pricing" className="hover:text-black">Pricing</Link>
            <button
              onClick={loadSample}
              disabled={seeding}
              className="hover:text-black disabled:opacity-50"
              title="Seed a complete showcase build"
            >
              {seeding ? "Seeding…" : "Sample build"}
            </button>
            <Link href="/settings" className="hover:text-black">Settings</Link>
            <button
              onClick={() => {
                signOut();
                oauthSignOut({ callbackUrl: "/" });
              }}
              className="hover:text-black"
            >
              Sign out
            </button>
          </div>
          <button
            onClick={() => promptRef.current?.focus()}
            className="bg-black text-white text-[12px] rounded-full px-4 py-1.5"
          >
            New build
          </button>
        </div>
      </nav>

      <div className="max-w-4xl w-full mx-auto px-6 py-12 flex-1">
        {/* Greeting */}
        <header className="mb-8">
          <h1 className="serif text-4xl md:text-5xl leading-tight">
            <span style={{ color: "var(--ink-muted)" }}>{greeting()},</span>{" "}
            {user.name.split(" ")[0]}.
          </h1>
          <p className="text-[13px] mt-2 max-w-xl leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Describe what you want to build. Pegasus drafts the living blueprint,
            hunts down every gap — missing screens, absent APIs, broken
            integrations — and writes the code that closes them.
          </p>
        </header>

        {/* Quick start */}
        <form onSubmit={quickStart} className="mb-8">
          <div
            className="bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3"
            style={{ borderColor: "var(--hairline)" }}
          >
            <Icon name="idea" size={16} strokeWidth={1.8} style={{ color: "var(--ink-muted)" }} />
            <input
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should Pegasus build next?"
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={creating || !prompt.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium rounded-full px-4 py-2 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {creating ? "Opening..." : "Start building"}
              {!creating && <Icon name="arrow-right" size={11} strokeWidth={2.2} />}
            </button>
          </div>
        </form>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {stats.map(([label, value, icon]) => (
            <div
              key={label}
              className="bg-white rounded-2xl border p-4 flex items-start justify-between"
              style={{ borderColor: "var(--hairline)" }}
            >
              <div>
                <div className="serif text-3xl">{value}</div>
                <div className="text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>
                  {label}
                </div>
              </div>
              <span style={{ color: "#c9c6bd" }}>
                <Icon name={icon} size={16} strokeWidth={1.6} />
              </span>
            </div>
          ))}
        </div>

        {/* Top gaps across builds */}
        {topGaps.length > 0 && (
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="serif text-2xl">Close these next.</h2>
              <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                highest-severity gaps across your builds
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {topGaps.map(({ project, gap }) => (
                <Link
                  key={`${project.id}-${gap.id}`}
                  href={`/project/${project.id}`}
                  className="bg-white rounded-xl border px-4 py-3 flex items-center gap-3 hover:border-black transition-colors"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: SEVERITY_COLOR[gap.severity] }}
                  />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium truncate">{gap.title}</div>
                    <div className="text-[10px] font-mono" style={{ color: "var(--ink-muted)" }}>
                      {project.name} · {gap.severity}
                    </div>
                  </div>
                  <span className="ml-auto shrink-0" style={{ color: "var(--ink-muted)" }}>
                    <Icon name="arrow-right" size={11} strokeWidth={2} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Builds */}
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="serif text-2xl">Your builds.</h2>
          <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
            board to blueprint to code to ship
          </span>
        </div>

        {projects.length === 0 ? (
          <div
            className="rounded-2xl border bg-white p-10 text-center"
            style={{ borderColor: "var(--hairline)" }}
          >
            <p className="text-sm mb-1" style={{ color: "var(--ink-muted)" }}>
              Nothing on the board yet.
            </p>
            <p className="text-[12px] mb-5" style={{ color: "var(--ink-muted)" }}>
              Type an idea above — or load the sample build to see the whole loop.
            </p>
            <button
              onClick={loadSample}
              disabled={seeding}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-full px-5 py-2 disabled:opacity-50"
            >
              {seeding ? "Seeding sample…" : "Load the sample build"}
              {!seeding && <Icon name="arrow-right" size={12} strokeWidth={2.2} />}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => {
              const sevCounts = SEVERITY_ORDER.map((sev) => ({
                sev,
                n: (p.blueprint?.gaps ?? []).filter((g) => g.severity === sev).length,
              })).filter((x) => x.n > 0);
              return (
                <Link
                  key={p.id}
                  href={`/project/${p.id}`}
                  className="group rounded-2xl border bg-white p-5 hover:border-black transition-colors"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    {renamingId === p.id ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={() => renameProject(p.id, renameVal)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameProject(p.id, renameVal);
                          if (e.key === "Escape") setRenamingId(null);
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.preventDefault()}
                        className="flex-1 text-sm font-semibold outline-none border-b bg-transparent min-w-0"
                        style={{ borderColor: "var(--hairline)" }}
                      />
                    ) : (
                      <h3
                        className="text-sm font-semibold truncate cursor-text"
                        title="Double-click to rename"
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          setRenamingId(p.id);
                          setRenameVal(p.name);
                        }}
                      >
                        {p.name}
                      </h3>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[10px] font-mono uppercase tracking-wide rounded-full px-2 py-0.5"
                        style={{
                          color: p.blueprint ? "#15803d" : "var(--ink-muted)",
                          background: p.blueprint ? "rgba(21,128,61,0.08)" : "rgba(0,0,0,0.04)",
                        }}
                      >
                        {p.blueprint ? "Blueprint ready" : "On the board"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRenamingId(p.id);
                          setRenameVal(p.name);
                        }}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        title="Rename build"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        <Icon name="design" size={11} strokeWidth={2} />
                      </button>
                      <button
                        onClick={(e) => remove(e, p.id)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        title="Delete build"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        <Icon name="close" size={12} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-[12px] mt-2 line-clamp-2" style={{ color: "var(--ink-muted)" }}>
                      {p.description}
                    </p>
                  )}
                  {p.blueprint && p.blueprint.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.blueprint.techStack.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono rounded-md px-1.5 py-0.5"
                          style={{ background: "rgba(0,0,0,0.04)", color: "var(--ink-muted)" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <StatusBar project={p} />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[10px] font-mono" style={{ color: "#b3b1aa" }}>
                      {(p.items ?? []).length} cards
                      {p.blueprint ? ` · ${p.blueprint.nodes.length} nodes` : ""}
                      {(p.generated?.length ?? 0) > 0 ? ` · ${p.generated!.length} generated` : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      {sevCounts.map(({ sev, n }) => (
                        <span
                          key={sev}
                          title={`${n} ${sev}`}
                          className="flex items-center gap-1 text-[10px] font-mono"
                          style={{ color: SEVERITY_COLOR[sev] }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: SEVERITY_COLOR[sev] }}
                          />
                          {n}
                        </span>
                      ))}
                      <span className="text-[10px] font-mono" style={{ color: "#b3b1aa" }}>
                        {timeAgo(p.updatedAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
