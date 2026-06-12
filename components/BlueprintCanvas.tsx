"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Icon } from "./icons";
import type { Blueprint, BlueprintNode, NodeStatus, NodeType } from "@/lib/types";

const COLUMN_ORDER: NodeType[] = [
  "design",
  "page",
  "component",
  "api",
  "service",
  "database",
  "external",
  "doc",
];

const TYPE_LABEL: Record<NodeType, string> = {
  design: "DESIGN",
  page: "PAGE",
  component: "COMPONENT",
  api: "API",
  service: "SERVICE",
  database: "DATABASE",
  external: "EXTERNAL",
  doc: "DOCS",
};

const TYPE_ICON: Record<NodeType, string> = {
  design: "design",
  page: "page",
  component: "component",
  api: "api",
  service: "service",
  database: "database",
  external: "external",
  doc: "doc",
};

const STATUS_COLOR: Record<NodeStatus, string> = {
  existing: "var(--ok)",
  partial: "var(--warn)",
  missing: "var(--bad)",
};

type PegasusNodeData = {
  bp: BlueprintNode;
  dimmed: boolean;
  [key: string]: unknown;
};

function PegasusNode({ data }: NodeProps<Node<PegasusNodeData>>) {
  const { bp, dimmed } = data;
  const color = STATUS_COLOR[bp.status];
  return (
    <div
      title={bp.description}
      className="rounded-lg px-3 py-2 w-[200px] transition-opacity"
      style={{
        background: "var(--panel-2)",
        border: `1px solid ${bp.status === "missing" ? color : "var(--line)"}`,
        borderStyle: bp.status === "missing" ? "dashed" : "solid",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.07)",
        opacity: dimmed ? 0.25 : 1,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "var(--line)" }} />
      <div className="flex items-center justify-between gap-2">
        <span
          className="flex items-center gap-1 text-[9px] tracking-[0.15em] font-mono"
          style={{ color: "var(--muted)" }}
        >
          <Icon name={TYPE_ICON[bp.type]} size={10} strokeWidth={1.8} /> {TYPE_LABEL[bp.type]}
        </span>
        <span
          className={`inline-block h-2 w-2 rounded-full ${bp.status !== "existing" ? "animate-pulse-soft" : ""}`}
          style={{ background: color }}
        />
      </div>
      <div className="text-[13px] font-medium leading-tight mt-1">{bp.label}</div>
      {bp.tech ? (
        <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--muted)" }}>
          {bp.tech}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} style={{ background: "var(--line)" }} />
    </div>
  );
}

const nodeTypes = { pegasus: PegasusNode };

export default function BlueprintCanvas({
  blueprint,
  highlightIds,
  onNodeClick,
}: {
  blueprint: Blueprint;
  highlightIds: string[] | null;
  onNodeClick?: (id: string) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const byType = new Map<NodeType, BlueprintNode[]>();
    for (const t of COLUMN_ORDER) byType.set(t, []);
    for (const n of blueprint.nodes) {
      (byType.get(n.type) ?? byType.get("doc"))!.push(n);
    }
    const highlight = highlightIds && highlightIds.length > 0 ? new Set(highlightIds) : null;

    const nodes: Node<PegasusNodeData>[] = [];
    let col = 0;
    for (const t of COLUMN_ORDER) {
      const group = byType.get(t)!;
      if (group.length === 0) continue;
      group.forEach((bp, i) => {
        nodes.push({
          id: bp.id,
          type: "pegasus",
          position: { x: col * 270, y: i * 120 + (col % 2) * 40 },
          data: { bp, dimmed: highlight ? !highlight.has(bp.id) : false },
        });
      });
      col += 1;
    }

    const edges: Edge[] = blueprint.edges.map((e) => {
      const color = STATUS_COLOR[e.status];
      const dimmedEdge = highlight ? !(highlight.has(e.source) && highlight.has(e.target)) : false;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.status === "missing",
        style: {
          stroke: color,
          opacity: dimmedEdge ? 0.1 : e.status === "existing" ? 0.5 : 0.9,
          strokeDasharray: e.status === "partial" ? "6 4" : undefined,
        },
        labelStyle: { fill: "var(--muted)", fontSize: 9, fontFamily: "var(--font-geist-mono)" },
        labelBgStyle: { fill: "var(--background)", fillOpacity: 0.8 },
      };
    });

    return { nodes, edges };
  }, [blueprint, highlightIds]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_, node) => onNodeClick?.(node.id)}
      nodesConnectable={false}
      style={{ background: "transparent" }}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color="#e3e3e3" />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => STATUS_COLOR[(n.data as PegasusNodeData).bp.status]}
        maskColor="rgba(255, 255, 255, 0.75)"
      />
    </ReactFlow>
  );
}
