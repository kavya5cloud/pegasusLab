"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Icon } from "./icons";
import type { BoardItem, ItemKind } from "@/lib/types";

const KIND_META: Record<ItemKind, { icon: string; label: string; accent: string }> = {
  idea:         { icon: "idea",     label: "Idea",           accent: "#b45309" },
  code:         { icon: "code",     label: "Code",           accent: "#0f766e" },
  github:       { icon: "github",   label: "GitHub repo",    accent: "#6d28d9" },
  figma:        { icon: "figma",    label: "Figma design",   accent: "#be123c" },
  image:        { icon: "image",    label: "Screenshot",     accent: "#1d4ed8" },
  doc:          { icon: "doc",      label: "Document",       accent: "#57534e" },
  voice:        { icon: "mic",      label: "Voice note",     accent: "#b45309" },
  requirement:  { icon: "doc",      label: "Requirement",    accent: "#15803d" },
  api:          { icon: "api",      label: "API spec",       accent: "#0f766e" },
  database:     { icon: "database", label: "DB schema",      accent: "#6d28d9" },
  conversation: { icon: "idea",     label: "Conversation",   accent: "#0369a1" },
};

type CardData = {
  item: BoardItem;
  onPatch: (id: string, patch: Partial<BoardItem>) => void;
  onDelete: (id: string) => void;
  [key: string]: unknown;
};

function VoiceRecorder({ item, onPatch }: { item: BoardItem; onPatch: (id: string, p: Partial<BoardItem>) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srRef = useRef<any>(null);
  const transcriptRef = useRef("");

  const hasAudio = !!item.dataUrl;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          onPatch(item.id, {
            dataUrl: reader.result as string,
            content: transcriptRef.current || item.content,
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

      // Live transcription via Web Speech API (no key needed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
      if (SR) {
        const sr = new SR();
        sr.continuous = true;
        sr.interimResults = true;
        transcriptRef.current = item.content ?? "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sr.onresult = (e: any) => {
          let text = "";
          for (let i = 0; i < e.results.length; i++) {
            text += e.results[i][0].transcript + " ";
          }
          transcriptRef.current = text.trim();
          onPatch(item.id, { content: transcriptRef.current });
        };
        sr.start();
        srRef.current = sr;
      }
    } catch {
      alert("Microphone access denied.");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    mediaRef.current = null;
    srRef.current?.stop();
    srRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2">
      {hasAudio ? (
        <audio controls src={item.dataUrl} className="w-full nodrag" style={{ height: 36 }} />
      ) : null}
      <div className="flex items-center gap-2">
        {recording ? (
          <button
            onClick={stopRecording}
            className="nodrag flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-mono"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            <span className="inline-block h-2 w-2 rounded-sm bg-white animate-pulse" />
            {fmt(seconds)} — Stop
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="nodrag flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-mono"
            style={{ background: "var(--background)", border: "1px solid var(--line)", color: "var(--foreground)" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6 10a1 1 0 0 1 2 0 8 8 0 0 1-7 7.94V21h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-2.06A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0z"/>
            </svg>
            {hasAudio ? "Re-record" : "Record"}
          </button>
        )}
        {hasAudio && !recording && (
          <button
            onClick={() => onPatch(item.id, { dataUrl: "" })}
            className="nodrag text-[10px] font-mono"
            style={{ color: "var(--muted)" }}
          >
            clear
          </button>
        )}
      </div>
      <textarea
        className="nodrag nowheel w-full rounded px-2 py-1.5 text-[11px] outline-none resize-none"
        style={{ background: "var(--background)", border: "1px solid var(--line)", minHeight: 50 }}
        value={item.content}
        placeholder="Transcript or notes…"
        onChange={(e) => onPatch(item.id, { content: e.target.value })}
      />
    </div>
  );
}

function BoardCard({ data }: NodeProps<Node<CardData>>) {
  const { item, onPatch, onDelete } = data;
  const meta = KIND_META[item.kind];
  const isUrlKind = item.kind === "github" || item.kind === "figma";

  return (
    <div
      className="rounded-xl w-[260px] overflow-hidden"
      style={{
        background: "var(--panel-2)",
        border: "1px solid var(--line)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 22px rgba(0,0,0,0.07)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--line)", background: "var(--panel)" }}
      >
        <span className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase" style={{ color: meta.accent }}>
          <Icon name={meta.icon} size={11} strokeWidth={1.8} /> {meta.label}
        </span>
        <button
          onClick={() => onDelete(item.id)}
          className="nodrag text-xs leading-none px-1 rounded hover:opacity-100 opacity-50"
          style={{ color: "var(--bad)" }}
          title="Remove card"
        >
          <Icon name="close" size={11} strokeWidth={2} />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <input
          className="nodrag w-full bg-transparent text-[13px] font-medium outline-none"
          value={item.title}
          placeholder="Title"
          onChange={(e) => onPatch(item.id, { title: e.target.value })}
        />

        {item.kind === "voice" ? (
          <VoiceRecorder item={item} onPatch={onPatch} />
        ) : item.kind === "image" ? (
          <>
            {item.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.dataUrl}
                alt={item.title}
                className="w-full rounded-md"
                style={{ border: "1px solid var(--line)", maxHeight: 220, objectFit: "contain" }}
              />
            ) : (
              <div
                className="text-[11px] rounded-md p-3 text-center"
                style={{ color: "var(--muted)", border: "1px dashed var(--line)" }}
              >
                Drop an image file on the board to attach it
              </div>
            )}
            <input
              className="nodrag w-full rounded px-2 py-1.5 text-[11px] outline-none"
              style={{ background: "var(--background)", border: "1px solid var(--line)", color: "var(--muted)" }}
              value={item.content}
              placeholder="What does this screen show?"
              onChange={(e) => onPatch(item.id, { content: e.target.value })}
            />
          </>
        ) : isUrlKind ? (
          <input
            className="nodrag w-full rounded px-2 py-1.5 text-[11px] font-mono outline-none"
            style={{ background: "var(--background)", border: "1px solid var(--line)" }}
            value={item.content}
            placeholder={item.kind === "github" ? "https://github.com/owner/repo" : "https://figma.com/file/…"}
            onChange={(e) => onPatch(item.id, { content: e.target.value })}
          />
        ) : (
          <textarea
            className="nodrag nowheel w-full rounded px-2 py-1.5 text-[11px] outline-none resize-none"
            style={{
              background: "var(--background)",
              border: "1px solid var(--line)",
              fontFamily: item.kind === "code" ? "var(--font-geist-mono)" : undefined,
              minHeight: item.kind === "idea" ? 70 : 110,
            }}
            value={item.content}
            placeholder={
              item.kind === "idea"         ? "Write the idea…"
              : item.kind === "code"       ? "Paste code…"
              : item.kind === "requirement"? "As a user, I want to… so that…"
              : item.kind === "api"        ? "GET /endpoint\n\nRequest / response shape…"
              : item.kind === "database"   ? "Table: name\n  id   uuid pk\n  …"
              : item.kind === "conversation"? "Paste meeting notes, chat log, interview…"
              : "Paste docs / notes…"
            }
            onChange={(e) => onPatch(item.id, { content: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}

const nodeTypes = { card: BoardCard };

function newItem(kind: ItemKind, x: number, y: number, extra?: Partial<BoardItem>): BoardItem {
  return {
    id: crypto.randomUUID().slice(0, 8),
    kind,
    title: "",
    content: "",
    x,
    y,
    ...extra,
  };
}

function BoardInner({
  initialItems,
  onItemsChange,
}: {
  initialItems: BoardItem[];
  onItemsChange: (items: BoardItem[]) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const changeRef = useRef(onItemsChange);
  changeRef.current = onItemsChange;

  const patchRef = useRef<(id: string, patch: Partial<BoardItem>) => void>(() => {});
  const deleteRef = useRef<(id: string) => void>(() => {});

  const toNode = useCallback((item: BoardItem): Node<CardData> => {
    return {
      id: item.id,
      type: "card",
      position: { x: item.x, y: item.y },
      data: {
        item,
        onPatch: (id, patch) => patchRef.current(id, patch),
        onDelete: (id) => deleteRef.current(id),
      },
    };
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CardData>>(
    initialItems.map((i) => ({
      id: i.id,
      type: "card",
      position: { x: i.x, y: i.y },
      data: {
        item: i,
        onPatch: (id: string, patch: Partial<BoardItem>) => patchRef.current(id, patch),
        onDelete: (id: string) => deleteRef.current(id),
      },
    }))
  );

  patchRef.current = (id, patch) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, item: { ...n.data.item, ...patch } } } : n
      )
    );
  };
  deleteRef.current = (id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
  };

  // Propagate every change (position, content, add, remove) upward.
  useEffect(() => {
    changeRef.current(
      nodes.map((n) => ({ ...n.data.item, x: n.position.x, y: n.position.y }))
    );
  }, [nodes]);

  const addItem = useCallback(
    (kind: ItemKind, pos?: { x: number; y: number }, extra?: Partial<BoardItem>) => {
      const base =
        pos ??
        screenToFlowPosition({
          x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
          y: window.innerHeight / 2 + (Math.random() - 0.5) * 120,
        });
      const item = newItem(kind, base.x, base.y, extra);
      setNodes((nds) => [...nds, toNode(item)]);
    },
    [screenToFlowPosition, setNodes, toNode]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList, pos: { x: number; y: number }) => {
      let offset = 0;
      for (const file of Array.from(files)) {
        const at = { x: pos.x + offset, y: pos.y + offset };
        offset += 30;
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = () =>
            addItem("image", at, {
              title: file.name,
              dataUrl: String(reader.result),
            });
          reader.readAsDataURL(file);
        } else if (file.size < 1_000_000) {
          const reader = new FileReader();
          reader.onload = () =>
            addItem(/\.(md|txt|rst)$/i.test(file.name) ? "doc" : "code", at, {
              title: file.name,
              content: String(reader.result),
            });
          reader.readAsText(file);
        }
      }
    },
    [addItem]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files, pos);
        return;
      }
      const uri = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
      if (uri && /^https?:\/\//.test(uri.trim())) {
        const url = uri.trim().split("\n")[0];
        const kind: ItemKind = url.includes("github.com")
          ? "github"
          : url.includes("figma.com")
            ? "figma"
            : "doc";
        addItem(kind, pos, { title: url.replace(/^https?:\/\//, "").slice(0, 40), content: url });
      } else if (uri) {
        addItem("idea", pos, { content: uri });
      }
    },
    [screenToFlowPosition, handleFiles, addItem]
  );

  const TOOLBAR: { kind: ItemKind; hint: string }[] = [
    { kind: "idea",         hint: "An idea or feature in plain words" },
    { kind: "requirement",  hint: "A product requirement or user story" },
    { kind: "code",         hint: "Paste a code snippet or file" },
    { kind: "api",          hint: "API spec, endpoint or contract" },
    { kind: "database",     hint: "Database schema or data model" },
    { kind: "github",       hint: "Link a GitHub repository" },
    { kind: "figma",        hint: "Link a Figma file" },
    { kind: "image",        hint: "Attach a design screenshot" },
    { kind: "doc",          hint: "Notes, specs, documentation" },
    { kind: "conversation", hint: "A chat log, interview or meeting notes" },
    { kind: "voice",        hint: "Record a voice note or spoken idea" },
  ];

  return (
    <div className="absolute inset-0" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView={nodes.length > 0}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".react-flow__node")) return;
          addItem("idea", screenToFlowPosition({ x: e.clientX, y: e.clientY }));
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color="#e3e3e3" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* Toolbar */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl px-2 py-1.5 z-10"
        style={{ background: "var(--panel)", border: "1px solid var(--line)", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" }}
      >
        {TOOLBAR.map(({ kind, hint }) => {
          const meta = KIND_META[kind];
          return (
            <button
              key={kind}
              title={hint}
              onClick={() => {
                if (kind === "image") fileInputRef.current?.click();
                else addItem(kind);
              }}
              className="flex flex-col items-center px-2.5 py-1 rounded-lg hover:bg-[var(--panel-2)] transition-colors"
            >
              <span style={{ color: meta.accent }}>
                <Icon name={meta.icon} size={15} strokeWidth={1.7} />
              </span>
              <span className="text-[9px] font-mono mt-0.5" style={{ color: "var(--muted)" }}>
                {meta.label}
              </span>
            </button>
          );
        })}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(
                e.target.files,
                screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
              );
              e.target.value = "";
            }
          }}
        />
      </div>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-md px-6">
            <div className="flex justify-center mb-3" style={{ color: "var(--accent)" }}>
              <Icon name="logo" size={32} strokeWidth={1.8} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              This is your project whiteboard. Drop <span style={{ color: "var(--foreground)" }}>ideas</span>,{" "}
              <span style={{ color: "var(--foreground)" }}>code</span>,{" "}
              <span style={{ color: "var(--foreground)" }}>GitHub repos</span>,{" "}
              <span style={{ color: "var(--foreground)" }}>Figma links</span> and{" "}
              <span style={{ color: "var(--foreground)" }}>design screenshots</span> anywhere —
              drag files straight from your desktop, or double-click to jot an idea. When the board
              holds everything you know, hit <span style={{ color: "var(--accent)" }}>Build app</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Board(props: {
  initialItems: BoardItem[];
  onItemsChange: (items: BoardItem[]) => void;
}) {
  return (
    <ReactFlowProvider>
      <BoardInner {...props} />
    </ReactFlowProvider>
  );
}
