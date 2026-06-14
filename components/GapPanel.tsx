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
  onPreview,
  generatingGapId,
}: {
  gaps: Gap[];
  selectedGapId: string | null;
  onSelect: (gap: Gap | null) => void;
  onGenerate: (gap: Gap) => void;
  onPreview: (gap: Gap) => void;
  generatingGapId: string | null;
}) {
  const open = [...gaps]
    .filter((g) => !g.resolved)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const resolved = gaps.filter((g) => g.resolved);

  return (
    <div className="flex flex-col gap-2">
      {open.map((gap) => {
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
                <div className="flex items-center gap-2">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(gap);
                    }}
                    className="text-xs font-medium px-3.5 py-1.5 rounded-full transition-colors"
                    style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
                  >
                    Live preview
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {open.length === 0 && resolved.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No gaps detected — this blueprint is complete.
        </p>
      )}

      {open.length === 0 && resolved.length > 0 && (
        <div
          className="rounded-lg p-3 text-sm text-center"
          style={{ background: "rgba(52,211,153,0.08)", border: "1px solid var(--ok)", color: "var(--ok)" }}
        >
          ✓ All gaps closed — every node is built.
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <div
            className="text-[10px] font-mono uppercase tracking-wider mt-2 pt-2"
            style={{ color: "var(--muted)", borderTop: "1px solid var(--line)" }}
          >
            Resolved ({resolved.length})
          </div>
          {resolved.map((gap) => (
            <div
              key={gap.id}
              onClick={() => onGenerate(gap)}
              className="rounded-lg p-2.5 cursor-pointer transition-colors flex items-center gap-2"
              style={{ background: "var(--panel)", border: "1px solid var(--line)", opacity: 0.7 }}
              title="Regenerate code for this gap"
            >
              <span
                className="flex items-center justify-center h-4 w-4 rounded-full shrink-0 text-[10px]"
                style={{ background: "var(--ok)", color: "#fff" }}
              >
                ✓
              </span>
              <span className="text-xs line-through" style={{ color: "var(--muted)" }}>
                {gap.title}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
