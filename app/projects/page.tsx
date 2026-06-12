"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { getUser, signOut, type SessionUser } from "@/lib/auth";
import type { Project } from "@/lib/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatusBar({ project }: { project: Project }) {
  const bp = project.blueprint;
  if (!bp || bp.nodes.length === 0) {
    return (
      <div className="h-1 rounded-full" style={{ background: "var(--hairline)" }} />
    );
  }
  const total = bp.nodes.length;
  const pct = (s: string) =>
    (bp.nodes.filter((n) => n.status === s).length / total) * 100;
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
  const promptRef = useRef<HTMLInputElement>(null);

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

  async function remove(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  if (!user) {
    return <main className="flex-1 min-h-screen" style={{ background: "var(--paper)" }} />;
  }

  const blueprintsReady = projects.filter((p) => p.blueprint).length;
  const openGaps = projects.reduce((n, p) => n + (p.blueprint?.gaps.length ?? 0), 0);
  const cardsOnBoards = projects.reduce((n, p) => n + (p.items?.length ?? 0), 0);

  const stats: [string, number][] = [
    ["Builds", projects.length],
    ["Blueprints ready", blueprintsReady],
    ["Open gaps", openGaps],
    ["Cards on boards", cardsOnBoards],
  ];

  return (
    <main
      className="flex-1 min-h-screen flex flex-col"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      {/* Pill nav */}
      <nav className="flex items-center justify-center pt-8">
        <div
          className="flex items-center gap-6 bg-white rounded-full pl-4 pr-2 py-2 shadow-sm border"
          style={{ borderColor: "var(--hairline)" }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Icon name="logo" size={16} strokeWidth={2} />
            <span className="text-[13px] font-semibold tracking-tight">pegasus lab.</span>
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-[12px]" style={{ color: "var(--ink-muted)" }}>
            <Link href="/" className="hover:text-black">Platform</Link>
            <button
              onClick={() => {
                signOut();
                router.push("/");
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
        <form onSubmit={quickStart} className="mb-10">
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
              className="bg-black text-white text-[12px] font-medium rounded-full px-4 py-2 hover:bg-neutral-800 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {creating ? "Opening..." : "Start building"}
              {!creating && <Icon name="arrow-right" size={11} strokeWidth={2.2} />}
            </button>
          </div>
        </form>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="bg-white rounded-2xl border p-4"
              style={{ borderColor: "var(--hairline)" }}
            >
              <div className="serif text-3xl">{value}</div>
              <div className="text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Builds */}
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="serif text-2xl">Your builds.</h2>
          <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
            board to blueprint to code
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
            <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
              Type an idea above and Pegasus opens a whiteboard for it.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                className="group rounded-2xl border bg-white p-5 hover:border-black transition-colors"
                style={{ borderColor: "var(--hairline)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold truncate">{p.name}</h3>
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
                <div className="mt-4">
                  <StatusBar project={p} />
                </div>
                <p className="text-[10px] font-mono mt-3" style={{ color: "#b3b1aa" }}>
                  {(p.items ?? []).length} cards
                  {p.blueprint
                    ? ` · ${p.blueprint.nodes.length} nodes · ${p.blueprint.gaps.length} gaps`
                    : " · awaiting build"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
