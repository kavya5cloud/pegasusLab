"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ContextGraph, ContextGraphNode, ContextLink } from "@/lib/types";

// ─── Node type config ─────────────────────────────────────────────────────────

const NODE_CONFIG: Record<ContextGraphNode["type"], { color: string; label: string }> = {
  requirement: { color: "#3b82f6", label: "REQ" },
  design:      { color: "#8b5cf6", label: "UI" },
  api:         { color: "#14b8a6", label: "API" },
  database:    { color: "#f97316", label: "DB" },
  userflow:    { color: "#22c55e", label: "FLOW" },
  code:        { color: "#ef4444", label: "CODE" },
  component:   { color: "#6366f1", label: "COMP" },
  service:     { color: "#f59e0b", label: "SVC" },
};

// ─── Force simulation (spring layout) ─────────────────────────────────────────

interface SimNode extends ContextGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function buildSimulation(
  nodes: ContextGraphNode[],
  links: ContextLink[],
  width: number,
  height: number
): SimNode[] {
  return nodes.map((n, i) => ({
    ...n,
    x: width / 2 + (Math.random() - 0.5) * width * 0.6,
    y: height / 2 + (Math.random() - 0.5) * height * 0.6,
    vx: 0,
    vy: 0,
  }));
}

function tick(nodes: SimNode[], links: ContextLink[], width: number, height: number) {
  const alpha = 0.08;
  const repulse = 1800;
  const linkDist = 110;
  const center = 0.02;

  // Repulsion between all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = repulse / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx -= fx * alpha;
      a.vy -= fy * alpha;
      b.vx += fx * alpha;
      b.vy += fy * alpha;
    }
  }

  // Spring attraction along links
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const link of links) {
    const a = nodeMap.get(link.from);
    const b = nodeMap.get(link.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const force = (dist - linkDist) * 0.04;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx * alpha;
    a.vy += fy * alpha;
    b.vx -= fx * alpha;
    b.vy -= fy * alpha;
  }

  // Gravity toward center
  const cx = width / 2, cy = height / 2;
  for (const n of nodes) {
    n.vx += (cx - n.x) * center * alpha;
    n.vy += (cy - n.y) * center * alpha;
  }

  // Integrate + dampen + clamp
  const pad = 30;
  for (const n of nodes) {
    n.vx *= 0.7;
    n.vy *= 0.7;
    n.x = Math.max(pad, Math.min(width - pad, n.x + n.vx));
    n.y = Math.max(pad, Math.min(height - pad, n.y + n.vy));
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const RADIUS = 18;

export default function ContextGraphPanel({ graph }: { graph: ContextGraph }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 320, h: 420 });
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const rafRef = useRef<number>(0);
  const nodesRef = useRef<SimNode[]>([]);
  const running = useRef(true);

  // Measure container
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.max(280, width), h: Math.max(300, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Init simulation when graph or dims change
  useEffect(() => {
    if (!graph.nodes.length) return;
    const sim = buildSimulation(graph.nodes, graph.links, dims.w, dims.h);
    nodesRef.current = sim;
    running.current = true;
    let step = 0;

    function loop() {
      if (!running.current) return;
      if (step < 200) {
        tick(nodesRef.current, graph.links, dims.w, dims.h);
        step++;
      }
      setNodes([...nodesRef.current]);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [graph, dims]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    dragging.current = { id, ox: svgPt.x, oy: svgPt.y };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const node = nodesRef.current.find((n) => n.id === dragging.current!.id);
    if (node) {
      node.x = svgPt.x;
      node.y = svgPt.y;
      node.vx = 0;
      node.vy = 0;
      setNodes([...nodesRef.current]);
    }
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = null; }, []);

  const selectedNode = selected ? nodes.find((n) => n.id === selected) : null;
  const selectedLinks = selected
    ? graph.links.filter((l) => l.from === selected || l.to === selected)
    : [];

  if (!graph.nodes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
        <div className="text-[13px]" style={{ color: "var(--muted)" }}>
          Context Graph will appear after blueprint generation.
        </div>
        <p className="text-[11px]" style={{ color: "var(--muted)", opacity: 0.6 }}>
          Pegasus maps requirements → designs → APIs → DB → flows → code.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Legend */}
      <div className="px-3 py-2 shrink-0 flex flex-wrap gap-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
        {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
          <span key={type} className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.color}44` }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* SVG canvas */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <svg
          ref={svgRef}
          width={dims.w}
          height={dims.h}
          className="absolute inset-0 w-full h-full"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="var(--muted)" opacity="0.5" />
            </marker>
          </defs>

          {/* Links */}
          {graph.links.map((link, i) => {
            const src = nodes.find((n) => n.id === link.from);
            const tgt = nodes.find((n) => n.id === link.to);
            if (!src || !tgt) return null;

            // Shorten line to avoid overlapping nodes
            const dx = tgt.x - src.x, dy = tgt.y - src.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / dist, ny = dy / dist;
            const x1 = src.x + nx * RADIUS;
            const y1 = src.y + ny * RADIUS;
            const x2 = tgt.x - nx * (RADIUS + 6);
            const y2 = tgt.y - ny * (RADIUS + 6);

            const isActive = selected === link.from || selected === link.to;

            return (
              <g key={i}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="var(--muted)"
                  strokeWidth={isActive ? 1.5 : 0.8}
                  strokeOpacity={isActive ? 0.9 : 0.3}
                  markerEnd="url(#arrowhead)"
                />
                {dist > 60 && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 4}
                    textAnchor="middle"
                    fontSize={8}
                    fill="var(--muted)"
                    fillOpacity={isActive ? 0.8 : 0.4}
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {link.relation}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const cfg = NODE_CONFIG[node.type] ?? { color: "#94a3b8", label: "?" };
            const isHovered = hovered === node.id;
            const isSelected = selected === node.id;
            const isConnected = selected
              ? graph.links.some((l) => (l.from === selected && l.to === node.id) || (l.to === selected && l.from === node.id))
              : false;
            const dimmed = selected && !isSelected && !isConnected;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{ cursor: "grab" }}
                onMouseDown={(e) => onMouseDown(e, node.id)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(selected === node.id ? null : node.id)}
              >
                {/* Glow ring when selected */}
                {isSelected && (
                  <circle r={RADIUS + 5} fill={cfg.color} opacity={0.18} />
                )}
                {/* Main circle */}
                <circle
                  r={RADIUS}
                  fill={cfg.color}
                  fillOpacity={dimmed ? 0.12 : isSelected ? 1 : isHovered ? 0.9 : 0.8}
                  stroke={isSelected ? cfg.color : "transparent"}
                  strokeWidth={2}
                />
                {/* Type label */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="700"
                  fill="#fff"
                  fillOpacity={dimmed ? 0.3 : 1}
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {cfg.label}
                </text>
                {/* Node name below */}
                <text
                  y={RADIUS + 10}
                  textAnchor="middle"
                  fontSize={8.5}
                  fill="var(--foreground)"
                  fillOpacity={dimmed ? 0.2 : 0.85}
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel when node selected */}
      {selectedNode && (
        <div className="shrink-0 px-3 py-2.5 space-y-1.5" style={{ borderTop: "1px solid var(--line)", background: "var(--panel-2)" }}>
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: (NODE_CONFIG[selectedNode.type]?.color ?? "#94a3b8") + "22",
                color: NODE_CONFIG[selectedNode.type]?.color ?? "#94a3b8",
              }}
            >
              {selectedNode.type.toUpperCase()}
            </span>
            <span className="text-[12px] font-semibold truncate">{selectedNode.label}</span>
          </div>
          {selectedLinks.length > 0 && (
            <div className="space-y-0.5">
              {selectedLinks.map((l, i) => {
                const other = nodes.find((n) => n.id === (l.from === selectedNode.id ? l.to : l.from));
                const dir = l.from === selectedNode.id ? "→" : "←";
                return (
                  <div key={i} className="text-[10px] flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                    <span className="font-mono">{dir}</span>
                    <span className="font-mono opacity-60">{l.relation}</span>
                    <span className="truncate">{other?.label ?? l.to}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stats footer */}
      <div className="shrink-0 px-3 py-1.5 flex items-center justify-between" style={{ borderTop: "1px solid var(--line)" }}>
        <span className="text-[9px] font-mono" style={{ color: "var(--muted)" }}>
          {graph.nodes.length} nodes · {graph.links.length} links
        </span>
        <span className="text-[9px] font-mono opacity-40" style={{ color: "var(--muted)" }}>
          drag to reposition · click to inspect
        </span>
      </div>
    </div>
  );
}
