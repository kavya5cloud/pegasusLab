"use client";

import type { Gap, GapSeverity } from "@/lib/types";

const SEVERITY_ORDER: Record<GapSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_STYLE: Record<GapSeverity, { color: string; bg: string }> = {
  critical: { color: "#be123c", bg: "rgba(190,18,60,0.08)" },
  high: { color: "#c2410c", bg: "rgba(194,65,12,0.08)" },
  medium: { color: "#b45309", bg: "rgba(180,83,9,0.08)" },
  low: { color: "#6b6963", bg: "rgba(107,105,99,0.08)" },
};

export default function GapPanel({
  gaps,
  selectedGapId,
  onSelect,
  onGenerate,
  generatingGapId,
}: {
  gaps: Gap[];
  selectedGapId: string | null;
  onSelect: (gap: Gap | null) => void;
  onGenerate: (gap: Gap) => void;
  generatingGapId: string | null;
}) {
  const sorted = [...gaps].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((gap) => {
        const sev = SEVERITY_STYLE[gap.severity];
        const selected = gap.id === selectedGapId;
        return (
          <div
            key={gap.id}
            onClick={() => onSelect(selected ? null : gap)}
            className="rounded-lg p-3 cursor-pointer transition-colors"
            style={{
              background: selected ? "var(--panel-2)" : "var(--panel)",
              border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ color: sev.color, background: sev.bg }}
              >
                {gap.severity}
              </span>
              <span
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: "var(--muted)" }}
              >
                {gap.category}
              </span>
            </div>
            <div className="text-sm font-medium mt-1.5">{gap.title}</div>
            {selected && (
              <div className="mt-2 space-y-2">
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  {gap.description}
                </p>
                <p className="text-xs leading-relaxed">
                  <span style={{ color: "var(--accent)" }}>Fix: </span>
                  {gap.recommendation}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerate(gap);
                  }}
                  disabled={generatingGapId !== null}
                  className="text-xs font-medium px-3.5 py-1.5 rounded-full transition-opacity disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "#ffffff" }}
                >
                  {generatingGapId === gap.id ? "Generating…" : "Generate code"}
                </button>
              </div>
            )}
          </div>
        );
      })}
      {sorted.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No gaps detected — this blueprint is complete.
        </p>
      )}
    </div>
  );
}
