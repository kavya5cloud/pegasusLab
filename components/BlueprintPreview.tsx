"use client";

import { Icon } from "./icons";

// Design coordinate space — cards + connector lines share this basis so they
// stay aligned at any render size (container keeps the 660:300 aspect ratio).
const W = 660;
const H = 300;
const CARD_W = 160;
const CARD_H = 54;

type Status = "existing" | "partial" | "missing";

const STATUS_COLOR: Record<Status, string> = {
  existing: "#15803d",
  partial: "#b45309",
  missing: "#be123c",
};

type PNode = {
  x: number;
  y: number;
  label: string;
  type: string;
  tech?: string;
  status: Status;
};

const NODES: PNode[] = [
  { x: 20, y: 40, label: "Dashboard", type: "PAGE", tech: "Next.js", status: "existing" },
  { x: 20, y: 140, label: "Settings", type: "PAGE", status: "missing" },
  { x: 250, y: 30, label: "/api/records", type: "API", status: "existing" },
  { x: 250, y: 120, label: "/api/auth", type: "API", status: "missing" },
  { x: 250, y: 210, label: "/api/billing", type: "API", status: "missing" },
  { x: 490, y: 20, label: "records", type: "DATABASE", status: "existing" },
  { x: 490, y: 110, label: "users", type: "DATABASE", status: "missing" },
  { x: 490, y: 200, label: "Stripe", type: "EXTERNAL", status: "missing" },
];

// [x1,y1,x2,y2,status]
const EDGES: [number, number, number, number, Status][] = [
  [180, 67, 250, 57, "existing"],
  [180, 67, 250, 147, "missing"],
  [180, 167, 250, 147, "missing"],
  [410, 57, 490, 47, "existing"],
  [410, 147, 490, 137, "missing"],
  [410, 237, 490, 227, "missing"],
];

const GAPS: [string, Status, string][] = [
  ["No authentication system", "missing", "critical"],
  ["Billing integration absent", "missing", "high"],
  ["Notifications never send", "partial", "high"],
  ["Data table lacks pagination", "partial", "medium"],
  ["Design system partially mapped", "existing", "low"],
];

const SEV_STYLE: Record<string, { color: string; bg: string }> = {
  critical: { color: "#be123c", bg: "rgba(190,18,60,0.08)" },
  high: { color: "#c2410c", bg: "rgba(194,65,12,0.08)" },
  medium: { color: "#b45309", bg: "rgba(180,83,9,0.08)" },
  low: { color: "#6b6963", bg: "rgba(107,105,99,0.08)" },
};

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

export default function BlueprintPreview() {
  return (
    <div
      className="rounded-2xl overflow-hidden bg-white border shadow-2xl"
      style={{ borderColor: "var(--hairline)" }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--hairline)", background: "#fbfbfa" }}
      >
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <div
          className="mx-auto flex items-center gap-1.5 text-[11px] font-medium rounded-md px-3 py-1"
          style={{ background: "white", border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}
        >
          <Icon name="logo" size={10} strokeWidth={2.2} />
          TaskFlow
          <span style={{ color: "#c9c6bd" }}>/</span>
          <span style={{ color: "var(--ink)" }}>Blueprint</span>
        </div>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: "rgba(190,18,60,0.08)", color: "#be123c" }}
        >
          5 gaps
        </span>
      </div>

      {/* Body */}
      <div className="flex">
        {/* Graph canvas */}
        <div
          className="relative flex-1"
          style={{
            aspectRatio: `${W} / ${H}`,
            backgroundImage: "radial-gradient(circle, #e3e3e3 1.2px, transparent 1.2px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* Connector lines */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
          >
            {EDGES.map(([x1, y1, x2, y2, status], i) => {
              const c = STATUS_COLOR[status];
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={c}
                  strokeWidth={1.5}
                  strokeDasharray={status === "missing" ? "5 4" : undefined}
                  opacity={status === "existing" ? 0.5 : 0.9}
                  className={status === "missing" ? "bp-flow" : undefined}
                />
              );
            })}
          </svg>

          {/* Node cards */}
          {NODES.map((n, i) => {
            const c = STATUS_COLOR[n.status];
            return (
              <div
                key={i}
                className="absolute rounded-lg bg-white px-2.5 py-1.5"
                style={{
                  left: pct(n.x, W),
                  top: pct(n.y, H),
                  width: pct(CARD_W, W),
                  height: pct(CARD_H, H),
                  border: `1px solid ${n.status === "missing" ? c : "var(--hairline)"}`,
                  borderStyle: n.status === "missing" ? "dashed" : "solid",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[7px] tracking-[0.12em] font-mono"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {n.type}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                </div>
                <div className="text-[10px] font-semibold leading-tight mt-0.5 truncate" style={{ color: "var(--ink)" }}>
                  {n.label}
                </div>
                {n.tech && (
                  <div className="text-[7px] font-mono" style={{ color: "var(--ink-muted)" }}>
                    {n.tech}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Gaps panel */}
        <div
          className="hidden md:block w-[230px] shrink-0 p-3"
          style={{ borderLeft: "1px solid var(--hairline)" }}
        >
          <div className="text-[10px] font-semibold mb-2.5" style={{ color: "var(--ink)" }}>
            Gaps <span style={{ color: "var(--ink-muted)" }}>(5)</span>
          </div>
          <div className="space-y-1.5">
            {GAPS.map(([title, , sev]) => {
              const s = SEV_STYLE[sev];
              return (
                <div
                  key={title}
                  className="rounded-lg px-2.5 py-2"
                  style={{ border: "1px solid var(--hairline)" }}
                >
                  <span
                    className="text-[7px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ color: s.color, background: s.bg }}
                  >
                    {sev}
                  </span>
                  <div className="text-[10px] font-medium mt-1 leading-tight" style={{ color: "var(--ink)" }}>
                    {title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bp-flow { to { stroke-dashoffset: -18; } }
        .bp-flow { animation: bp-flow 1s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .bp-flow { animation: none; } }
      `}</style>
    </div>
  );
}
