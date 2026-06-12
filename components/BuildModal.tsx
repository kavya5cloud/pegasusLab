"use client";

import { Icon } from "./icons";

export default function BuildModal({
  rebuild,
  onBlueprint,
  onChat,
  onClose,
}: {
  rebuild: boolean;
  onBlueprint: () => void;
  onChat: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(20,20,20,0.4)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border overflow-hidden"
        style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <h3 className="text-sm font-semibold">
            {rebuild ? "Rebuild this app — how?" : "Build this app — how?"}
          </h3>
          <button onClick={onClose} style={{ color: "var(--ink-muted)" }} title="Close">
            <Icon name="close" size={13} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 grid sm:grid-cols-2 gap-3">
          <button
            onClick={onBlueprint}
            className="text-left rounded-xl border p-4 hover:border-blue-600 transition-colors group"
            style={{ borderColor: "var(--hairline)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">
                <Icon name="blueprint" size={16} strokeWidth={1.8} />
              </span>
              <span className="text-[13px] font-semibold">Blueprint build</span>
              <span className="text-[9px] font-mono uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-blue-50 text-blue-700">
                recommended
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
              Pegasus reads the whole board, maps the architecture graph, finds
              every gap, and generates the code to close them.
            </p>
          </button>

          <button
            onClick={onChat}
            className="text-left rounded-xl border p-4 hover:border-blue-600 transition-colors"
            style={{ borderColor: "var(--hairline)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: "var(--ink)" }}>
                <Icon name="idea" size={16} strokeWidth={1.8} />
              </span>
              <span className="text-[13px] font-semibold">Chat mode</span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
              Talk it through with Pegasus first — refine scope, weigh the
              architecture, decide what to build, then run the build.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
