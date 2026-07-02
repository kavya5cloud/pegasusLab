"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import ThemeToggle from "@/components/ThemeToggle";
import { signOut as oauthSignOut } from "next-auth/react";
import { fetchUser, hasAnyApiKey, signOut, type SessionUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { GapSeverity, Project } from "@/lib/types";

/* ─── helpers ─── */

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const SEV_COLOR: Record<GapSeverity, string> = {
  critical: "#be123c",
  high: "#c2410c",
  medium: "#b45309",
  low: "#6b6963",
};
const SEV_ORDER: GapSeverity[] = ["critical", "high", "medium", "low"];

type FilterKey = "all" | "blueprints" | "gaps" | "generated";
type SortKey = "updated" | "created" | "name" | "gaps";

/* ─── sub-components ─── */

function StatusBar({ project }: { project: Project }) {
  const bp = project.blueprint;
  if (!bp || bp.nodes.length === 0)
    return <div className="h-0.5 rounded-full" style={{ background: "var(--hairline)" }} />;
  const total = bp.nodes.length;
  const pct = (s: string) => (bp.nodes.filter((n) => n.status === s).length / total) * 100;
  return (
    <div className="h-0.5 rounded-full overflow-hidden flex" style={{ background: "var(--hairline)" }}>
      <span style={{ width: `${pct("existing")}%`, background: "#15803d" }} />
      <span style={{ width: `${pct("partial")}%`, background: "#b45309" }} />
      <span style={{ width: `${pct("missing")}%`, background: "#be123c" }} />
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className ?? ""}`}
      style={{ background: "rgba(0,0,0,0.06)" }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "var(--hairline)" }}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full mb-1.5" />
      <Skeleton className="h-3 w-3/4 mb-4" />
      <div className="flex gap-1.5 mb-4">
        <Skeleton className="h-4 w-14 rounded-md" />
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-4 w-12 rounded-md" />
      </div>
      <Skeleton className="h-0.5 w-full mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/* ─── nav items ─── */
const NAV = [
  { label: "Dashboard", icon: "board", href: "/projects" },
  { label: "Settings", icon: "gear", href: "/settings" },
  { label: "Pricing", icon: "bolt", href: "/pricing" },
];

/* ─── main page ─── */
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showKeyBanner, setShowKeyBanner] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [usedThisWeek, setUsedThisWeek] = useState(0);
  const promptRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: Project[]) => {
        setProjects(data);
        // Demo/sample showcase projects don't count against the allowance.
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        setUsedThisWeek(data.filter((p) => !p.demo && p.createdAt >= weekAgo).length);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUser().then((u) => {
      if (!u) { router.replace("/auth?next=%2Fprojects"); return; }
      setUser(u);
      load();
    });
    // Only show the key banner if the server has no AI key configured either
    fetch("/api/status").then(r => r.json()).then(d => {
      if (d.demo && !hasAnyApiKey()) setShowKeyBanner(true);
    }).catch(() => {});
    const carried = new URLSearchParams(window.location.search).get("prompt");
    if (carried) { setPrompt(carried); setTimeout(() => promptRef.current?.focus(), 100); }
  }, [router, load]);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        promptRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
          items: [{ id: crypto.randomUUID().slice(0, 8), kind: "idea", title: "The idea", content: text, x: 0, y: 0 }],
        }),
      });
      if (res.status === 429) { setLimitHit(true); setCreating(false); return; }
      const project = await res.json();
      router.push(`/project/${project.id}`);
    } catch { setCreating(false); }
  }

  async function loadSample() {
    if (seeding) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/sample", { method: "POST" });
      const project = await res.json();
      router.push(`/project/${project.id}`);
    } catch { setSeeding(false); }
  }

  async function remove(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
    toast("Build deleted");
    load();
  }

  async function duplicate(e: React.MouseEvent, p: Project) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Copy of ${p.name}`,
          description: p.description,
          items: p.items,
        }),
      });
      if (res.status === 429) { setLimitHit(true); return; }
      if (!res.ok) throw new Error();
      toast("Build duplicated");
      load();
    } catch {
      toast("Could not duplicate");
    }
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
    toast("Renamed");
    load();
  }

  if (!user) return <div className="flex-1 min-h-screen" style={{ background: "var(--paper)" }} />;

  /* derived stats */
  const bpCount = projects.filter((p) => p.blueprint).length;
  const gapCount = projects.reduce((n, p) => n + (p.blueprint?.gaps.length ?? 0), 0);
  const artCount = projects.reduce((n, p) => n + (p.generated?.length ?? 0), 0);

  const STATS: { key: FilterKey; label: string; value: number; icon: string }[] = [
    { key: "all",        label: "Total builds",       value: projects.length, icon: "board"     },
    { key: "blueprints", label: "Blueprints ready",   value: bpCount,         icon: "blueprint" },
    { key: "gaps",       label: "Open gaps",          value: gapCount,        icon: "bolt"      },
    { key: "generated",  label: "Artifacts generated",value: artCount,        icon: "code"      },
  ];

  const topGaps = projects
    .flatMap((p) => (p.blueprint?.gaps ?? []).map((g) => ({ project: p, gap: g })))
    .sort((a, b) => SEV_ORDER.indexOf(a.gap.severity) - SEV_ORDER.indexOf(b.gap.severity))
    .slice(0, 4);

  /* filter → search → sort */
  let visible = projects
    .filter((p) => {
      if (filter === "blueprints") return !!p.blueprint;
      if (filter === "gaps")       return (p.blueprint?.gaps.length ?? 0) > 0;
      if (filter === "generated")  return (p.generated?.length ?? 0) > 0;
      return true;
    })
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    });

  visible = [...visible].sort((a, b) => {
    if (sort === "name")    return a.name.localeCompare(b.name);
    if (sort === "gaps")    return (b.blueprint?.gaps.length ?? 0) - (a.blueprint?.gaps.length ?? 0);
    if (sort === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); // "updated"
  });

  const activeLabel = STATS.find((s) => s.key === filter)?.label ?? "All builds";

  const remaining = Math.max(0, 2 - usedThisWeek);

  /* ─── sidebar shared markup (render helper, not a component — avoids
         remounts and satisfies react-hooks/component-definition rules) ─── */
  const renderSidebar = (onNav?: () => void) => {
    if (!user) return null;
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-4 pt-5 pb-3 border-b shrink-0" style={{ borderColor: "var(--hairline)" }}>
          <Link href="/" onClick={onNav}>
            <Image src="/pegasuslogo.png" alt="pegasus lab." width={110} height={92} className="h-14 w-auto" priority />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === "/projects";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNav}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors group"
                style={{
                  background: active ? "rgba(0,0,0,0.06)" : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon name={item.icon} size={14} strokeWidth={1.8} />
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
                )}
              </Link>
            );
          })}

          {/* Recent builds */}
          <div className="pt-4 pb-1 px-3">
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--ink-muted)", opacity: 0.45 }}>
              Recent builds
            </p>
          </div>

          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="px-3 py-2">
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          ) : projects.length === 0 ? (
            <p className="px-3 text-[11px]" style={{ color: "var(--ink-muted)", opacity: 0.5 }}>No builds yet</p>
          ) : (
            projects.slice(0, 7).map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                onClick={onNav}
                className="flex items-center gap-2 px-3 py-[7px] rounded-lg text-[12px] hover:bg-black/5 transition-colors truncate"
                style={{ color: "var(--ink-muted)" }}
                title={p.name}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: p.blueprint ? "#15803d" : "#d0cfc8" }}
                />
                <span className="truncate">{p.name}</span>
              </Link>
            ))
          )}

          <button
            onClick={() => { loadSample(); onNav?.(); }}
            disabled={seeding}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] hover:bg-black/5 transition-colors disabled:opacity-40 mt-1"
            style={{ color: "var(--ink-muted)" }}
          >
            <Icon name="refresh" size={12} strokeWidth={2} />
            {seeding ? "Seeding…" : "Load sample build"}
          </button>
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t shrink-0 space-y-0.5" style={{ borderColor: "var(--hairline)" }}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0"
              style={{ background: "#2563eb" }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium truncate leading-tight">{user.name.split(" ")[0]}</p>
              <p className="text-[10px] truncate leading-tight mt-0.5" style={{ color: "var(--ink-muted)" }}>
                {user.email}
              </p>
            </div>
          </div>
          <ThemeToggle variant="pill" />
          <button
            onClick={() => { signOut(); oauthSignOut({ callbackUrl: "/" }); }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] hover:bg-black/5 transition-colors text-left"
            style={{ color: "var(--ink-muted)" }}
          >
            <Icon name="arrow-right" size={12} strokeWidth={2} style={{ transform: "rotate(180deg)" }} />
            Sign out
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--paper)", color: "var(--ink)" }}>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 border-r h-full"
        style={{ borderColor: "var(--hairline)", background: "white" }}
      >
        {renderSidebar()}
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ background: "rgba(0,0,0,0.35)" }}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 md:hidden flex flex-col border-r transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderColor: "var(--hairline)", background: "white" }}
      >
        {renderSidebar(() => setSidebarOpen(false))}
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header
          className="shrink-0 flex items-center gap-3 px-5 py-3 border-b bg-white"
          style={{ borderColor: "var(--hairline)" }}
        >
          {/* Mobile: hamburger */}
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg hover:bg-black/5"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" size={16} strokeWidth={2} />
          </button>

          {/* Search */}
          <div
            className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[13px]"
            style={{ borderColor: "var(--hairline)", background: "var(--paper)", maxWidth: 360 }}
          >
            <Icon name="search" size={13} strokeWidth={2} style={{ color: "var(--ink-muted)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search builds…"
              className="flex-1 bg-transparent outline-none placeholder:text-neutral-400 text-[13px]"
            />
            {search ? (
              <button onClick={() => setSearch("")} style={{ color: "var(--ink-muted)" }}>
                <Icon name="close" size={11} strokeWidth={2.5} />
              </button>
            ) : (
              <kbd
                className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] rounded px-1.5 py-0.5 border"
                style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)", background: "white" }}
              >
                ⌘K
              </kbd>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => promptRef.current?.focus()}
              className="inline-flex items-center gap-1.5 bg-black text-white text-[12px] font-medium rounded-full px-4 py-1.5 hover:opacity-80 transition-opacity"
            >
              <Icon name="plus" size={11} strokeWidth={2.5} />
              <span>New build</span>
              <kbd
                className="hidden sm:inline-flex items-center font-mono text-[9px] bg-white/20 rounded px-1 py-0.5 ml-0.5"
              >
                ⌘N
              </kbd>
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <main className="px-6 py-6 max-w-5xl w-full mx-auto">

            {/* Onboarding banner — shown when no AI key is configured */}
            {showKeyBanner && (
              <div
                className="mb-5 rounded-2xl border px-5 py-4 flex items-start gap-4"
                style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.25)" }}
              >
                <div className="text-2xl shrink-0">⚡</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "#4338ca" }}>
                    Add your Gemini API key to activate the AI engine
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                    Pegasus is free forever when you bring your own key — no credit card needed.
                    Gemini 2.0 Flash has a generous free quota.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/settings?setup=1"
                    className="text-[12px] font-medium rounded-full px-4 py-1.5 text-white transition-colors"
                    style={{ background: "#4f46e5" }}
                  >
                    Add key →
                  </Link>
                  <button
                    onClick={() => setShowKeyBanner(false)}
                    className="text-[12px] rounded-full px-3 py-1.5 border transition-colors hover:bg-neutral-50"
                    style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Weekly limit reached modal */}
            {limitHit && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }}>
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                  <div className="text-4xl mb-4">🚀</div>
                  <h2 className="text-xl font-semibold mb-2">Weekly limit reached</h2>
                  <p className="text-[13px] mb-6" style={{ color: "var(--ink-muted)" }}>
                    The free plan includes <strong>2 new projects per week</strong>. Your allowance resets in 7 days, or upgrade for unlimited builds.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/pricing"
                      className="w-full bg-black text-white text-[13px] font-medium rounded-xl px-4 py-2.5 hover:bg-neutral-800 transition-colors"
                    >
                      Upgrade plan →
                    </Link>
                    <button
                      onClick={() => setLimitHit(false)}
                      className="w-full text-[13px] rounded-xl border px-4 py-2.5 hover:bg-neutral-50 transition-colors"
                      style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
                    >
                      Got it, I&apos;ll wait
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Page title + quick-start */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="serif text-2xl">Dashboard</h1>
                <span
                  className="text-[11px] font-mono px-2.5 py-1 rounded-full"
                  style={{
                    background: remaining === 0 ? "rgba(220,38,38,0.08)" : "rgba(16,185,129,0.08)",
                    color: remaining === 0 ? "#dc2626" : "#059669",
                    border: `1px solid ${remaining === 0 ? "rgba(220,38,38,0.2)" : "rgba(16,185,129,0.2)"}`,
                  }}
                >
                  {remaining === 0 ? "0 builds left this week" : `${remaining} of 2 builds left`}
                </span>
              </div>
              <form onSubmit={quickStart}>
                <div
                  className="bg-white rounded-2xl border shadow-sm p-3.5 flex items-center gap-3"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <Icon name="idea" size={15} strokeWidth={1.8} style={{ color: "var(--ink-muted)", flexShrink: 0 }} />
                  <input
                    ref={promptRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to build…"
                    className="flex-1 text-[13px] outline-none bg-transparent placeholder:text-neutral-400"
                  />
                  <button
                    type="submit"
                    disabled={creating || !prompt.trim() || remaining === 0}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium rounded-full px-4 py-1.5 disabled:opacity-40 transition-colors shrink-0"
                  >
                    {creating ? "Opening…" : "Start"}
                    {!creating && <Icon name="arrow-right" size={11} strokeWidth={2.2} />}
                  </button>
                </div>
                {remaining === 0 && (
                  <p className="text-[11px] mt-2 text-center" style={{ color: "var(--ink-muted)" }}>
                    Weekly limit reached —{" "}
                    <Link href="/pricing" className="underline hover:text-black">upgrade for unlimited</Link>
                  </p>
                )}
              </form>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
              {STATS.map((stat) => {
                const active = filter === stat.key;
                return (
                  <button
                    key={stat.key}
                    onClick={() => setFilter(active && stat.key !== "all" ? "all" : stat.key)}
                    className="rounded-2xl border p-4 flex items-start justify-between text-left transition-all hover:shadow-sm"
                    style={{
                      borderColor: active ? "#2563eb" : "var(--hairline)",
                      background: active ? "#eff6ff" : "white",
                      boxShadow: active ? "0 0 0 1px #2563eb" : undefined,
                    }}
                  >
                    <div>
                      {loading ? (
                        <Skeleton className="h-8 w-10 mb-1.5" />
                      ) : (
                        <div
                          className="serif text-3xl leading-none mb-1.5"
                          style={{ color: active ? "#2563eb" : "var(--ink)" }}
                        >
                          {stat.value}
                        </div>
                      )}
                      <div
                        className="text-[11px]"
                        style={{ color: active ? "#2563eb" : "var(--ink-muted)" }}
                      >
                        {stat.label}
                      </div>
                    </div>
                    <span style={{ color: active ? "#93c5fd" : "#d0cfc8" }}>
                      <Icon name={stat.icon} size={15} strokeWidth={1.6} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Close these next */}
            {filter === "all" && !search && topGaps.length > 0 && (
              <section className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="serif text-lg">Close these next.</h2>
                  <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    highest severity · across all builds
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {topGaps.map(({ project, gap }) => (
                    <Link
                      key={`${project.id}-${gap.id}`}
                      href={`/project/${project.id}`}
                      className="bg-white rounded-xl border px-4 py-3 flex items-center gap-3 hover:border-black transition-colors group"
                      style={{ borderColor: "var(--hairline)" }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: SEV_COLOR[gap.severity] }}
                      />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium truncate">{gap.title}</div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--ink-muted)" }}>
                          {project.name} · {gap.severity}
                        </div>
                      </div>
                      <span className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--ink-muted)" }}>
                        <Icon name="arrow-right" size={11} strokeWidth={2} />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Builds header */}
            <div className="flex items-center gap-2 mb-4">
              <h2 className="serif text-lg mr-1">Builds</h2>

              {filter !== "all" && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-mono rounded-full px-2.5 py-0.5 border"
                  style={{ borderColor: "#bfdbfe", background: "#eff6ff", color: "#2563eb" }}
                >
                  {activeLabel}
                  <button onClick={() => setFilter("all")} title="Clear filter">
                    <Icon name="close" size={9} strokeWidth={2.5} />
                  </button>
                </span>
              )}

              {search && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-mono rounded-full px-2.5 py-0.5 border"
                  style={{ borderColor: "var(--hairline)", background: "white", color: "var(--ink-muted)" }}
                >
                  &ldquo;{search}&rdquo;
                  <button onClick={() => setSearch("")} title="Clear search">
                    <Icon name="close" size={9} strokeWidth={2.5} />
                  </button>
                </span>
              )}

              <div className="ml-auto flex items-center gap-3">
                <span className="text-[11px] hidden sm:block" style={{ color: "var(--ink-muted)" }}>
                  {visible.length} of {projects.length}
                </span>
                <div className="flex items-center gap-1">
                  <Icon name="sort" size={12} strokeWidth={2} style={{ color: "var(--ink-muted)" }} />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="text-[12px] bg-transparent outline-none cursor-pointer"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    <option value="updated">Recent</option>
                    <option value="created">Newest</option>
                    <option value="name">Name</option>
                    <option value="gaps">Most gaps</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Builds grid */}
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : projects.length === 0 ? (
              <div
                className="rounded-2xl border bg-white p-12 text-center"
                style={{ borderColor: "var(--hairline)" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#eff6ff" }}>
                  <Icon name="board" size={18} strokeWidth={1.5} style={{ color: "#2563eb" }} />
                </div>
                <p className="text-[14px] font-medium mb-1">Nothing on the board yet</p>
                <p className="text-[12px] mb-6" style={{ color: "var(--ink-muted)" }}>
                  Type an idea above — or load the sample build to see the full loop.
                </p>
                <button
                  onClick={loadSample}
                  disabled={seeding}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-full px-5 py-2 disabled:opacity-50 transition-colors"
                >
                  {seeding ? "Seeding…" : "Load the sample build"}
                  {!seeding && <Icon name="arrow-right" size={12} strokeWidth={2.2} />}
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div
                className="rounded-2xl border bg-white p-10 text-center"
                style={{ borderColor: "var(--hairline)" }}
              >
                <p className="text-[14px] font-medium mb-1">No results</p>
                <p className="text-[12px] mb-4" style={{ color: "var(--ink-muted)" }}>
                  {search
                    ? `Nothing matched "${search}"`
                    : `No builds match the "${activeLabel}" filter`}
                </p>
                <button
                  onClick={() => { setFilter("all"); setSearch(""); }}
                  className="text-[12px] text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visible.map((p) => {
                  const sevCounts = SEV_ORDER
                    .map((sev) => ({ sev, n: (p.blueprint?.gaps ?? []).filter((g) => g.severity === sev).length }))
                    .filter((x) => x.n > 0);
                  return (
                    <Link
                      key={p.id}
                      href={`/project/${p.id}`}
                      className="group rounded-2xl border bg-white p-5 hover:border-neutral-400 hover:shadow-sm transition-all"
                      style={{ borderColor: "var(--hairline)" }}
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
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
                              className="w-full text-[13px] font-semibold outline-none border-b bg-transparent"
                              style={{ borderColor: "#2563eb" }}
                            />
                          ) : (
                            <h3
                              className="text-[13px] font-semibold truncate cursor-text"
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
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="text-[10px] font-mono uppercase tracking-wide rounded-full px-2 py-0.5 whitespace-nowrap"
                            style={{
                              color: p.blueprint ? "#15803d" : "var(--ink-muted)",
                              background: p.blueprint ? "rgba(21,128,61,0.08)" : "rgba(0,0,0,0.04)",
                            }}
                          >
                            {p.blueprint ? "Blueprint ready" : "On the board"}
                          </span>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenamingId(p.id); setRenameVal(p.name); }}
                            className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity p-0.5 rounded"
                            title="Rename"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            <Icon name="design" size={11} strokeWidth={2} />
                          </button>
                          <button
                            onClick={(e) => duplicate(e, p)}
                            className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity p-0.5 rounded"
                            title="Duplicate"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            <Icon name="copy" size={11} strokeWidth={2} />
                          </button>
                          <button
                            onClick={(e) => remove(e, p.id)}
                            className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity p-0.5 rounded"
                            title="Delete"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            <Icon name="close" size={11} strokeWidth={2} />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {p.description && (
                        <p className="text-[12px] line-clamp-2 mb-3" style={{ color: "var(--ink-muted)" }}>
                          {p.description}
                        </p>
                      )}

                      {/* Tech stack */}
                      {p.blueprint && p.blueprint.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
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

                      {/* Progress bar */}
                      <StatusBar project={p} />

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-[10px] font-mono" style={{ color: "#b3b1aa" }}>
                          {(p.items ?? []).length} cards
                          {p.blueprint ? ` · ${p.blueprint.nodes.length} nodes` : ""}
                          {(p.generated?.length ?? 0) > 0 ? ` · ${p.generated!.length} artifacts` : ""}
                        </p>
                        <div className="flex items-center gap-2">
                          {sevCounts.map(({ sev, n }) => (
                            <span
                              key={sev}
                              title={`${n} ${sev}`}
                              className="flex items-center gap-0.5 text-[10px] font-mono"
                              style={{ color: SEV_COLOR[sev] }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEV_COLOR[sev] }} />
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

            {/* Bottom spacer */}
            <div className="h-10" />
          </main>
        </div>
      </div>
    </div>
  );
}
