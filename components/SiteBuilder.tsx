"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getContainer } from "@/lib/webcontainer";
import { siteStaticFiles, siteTree } from "@/lib/site-scaffold";
import { userApiHeaders } from "@/lib/auth";
import { Icon } from "./icons";
import type { GeneratedSite, Project, SiteFile, SitePlanFile } from "@/lib/types";

type Phase =
  | "planning"
  | "generating"
  | "booting"
  | "installing"
  | "starting"
  | "ready"
  | "error";

const PHASE_LABEL: Record<Phase, string> = {
  planning: "Planning the site…",
  generating: "Writing files…",
  booting: "Booting sandbox…",
  installing: "Installing dependencies…",
  starting: "Starting dev server…",
  ready: "Live",
  error: "Failed",
};

type FileStatus = "pending" | "generating" | "done";

export default function SiteBuilder({
  project,
  onClose,
  onSiteSaved,
}: {
  project: Project;
  onClose: () => void;
  onSiteSaved: (site: GeneratedSite) => void;
}) {
  const [phase, setPhase] = useState<Phase>("planning");
  const [plan, setPlan] = useState<SitePlanFile[]>([]);
  const [files, setFiles] = useState<SiteFile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, FileStatus>>({});
  const [url, setUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [rebuildNonce, setRebuildNonce] = useState(0);

  const cancelled = useRef(false);
  const devProcRef = useRef<{ kill: () => void } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const log = useCallback((line: string) => {
    const clean = line.replace(/\[[0-9;]*[a-zA-Z]/g, "").replace(/[\r]/g, "");
    if (!clean.trim()) return;
    setLogs((prev) => [...prev.slice(-300), clean]);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  useEffect(() => {
    cancelled.current = false;

    (async () => {
      try {
        let sitePlan: SitePlanFile[];
        let siteFiles: SiteFile[];

        const existing = rebuildNonce === 0 ? project.site : undefined;
        if (existing && existing.files.length > 0) {
          // Reopen a previously generated site without regenerating.
          sitePlan = existing.plan;
          siteFiles = existing.files;
          setPlan(sitePlan);
          setFiles(siteFiles);
          setStatuses(Object.fromEntries(sitePlan.map((f) => [f.path, "done" as FileStatus])));
        } else {
          // 1. Plan
          setPhase("planning");
          const planRes = await fetch(`/api/projects/${project.id}/site/plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...userApiHeaders() },
          });
          const planData = await planRes.json();
          if (!planRes.ok) throw new Error(planData.error ?? "Site planning failed");
          if (cancelled.current) return;
          sitePlan = planData.plan as SitePlanFile[];
          setPlan(sitePlan);
          setStatuses(Object.fromEntries(sitePlan.map((f) => [f.path, "pending" as FileStatus])));

          // 2. Generate file by file
          setPhase("generating");
          siteFiles = [];
          for (const file of sitePlan) {
            if (cancelled.current) return;
            setStatuses((s) => ({ ...s, [file.path]: "generating" }));
            const res = await fetch(`/api/projects/${project.id}/site/file`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...userApiHeaders() },
              body: JSON.stringify({ plan: sitePlan, file }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `Failed to generate ${file.path}`);
            siteFiles.push({ path: file.path, code: data.code });
            setFiles([...siteFiles]);
            setStatuses((s) => ({ ...s, [file.path]: "done" }));
          }

          // 3. Persist so reopening skips generation
          const site: GeneratedSite = {
            plan: sitePlan,
            files: siteFiles,
            generatedAt: new Date().toISOString(),
          };
          fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ site }),
          }).catch(() => {});
          onSiteSaved(site);
        }

        // 4. Boot + mount + install + run
        setPhase("booting");
        const wc = await getContainer();
        if (cancelled.current) return;
        await wc.mount(siteTree(project.name, siteFiles));
        if (cancelled.current) return;

        setPhase("installing");
        const install = await wc.spawn("npm", ["install"]);
        install.output.pipeTo(new WritableStream({ write: (c) => log(c) }));
        const code = await install.exit;
        if (cancelled.current) return;
        if (code !== 0) throw new Error("npm install failed");

        setPhase("starting");
        wc.on("server-ready", (_port, serverUrl) => {
          if (cancelled.current) return;
          setUrl(serverUrl);
          setPhase("ready");
        });
        const dev = await wc.spawn("npm", ["run", "dev"]);
        devProcRef.current = dev;
        dev.output.pipeTo(new WritableStream({ write: (c) => log(c) }));
      } catch (err) {
        if (cancelled.current) return;
        setErrorMsg(err instanceof Error ? err.message : "Site build failed");
        setPhase("error");
      }
    })();

    return () => {
      cancelled.current = true;
      devProcRef.current?.kill();
      devProcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, rebuildNonce]);

  async function downloadZip() {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const f of [...siteStaticFiles(project.name), ...files]) {
      zip.file(f.path, f.code);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-site.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const busy = phase !== "ready" && phase !== "error";
  const doneCount = Object.values(statuses).filter((s) => s === "done").length;
  const selected = files.find((f) => f.path === selectedPath);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--panel)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${busy ? "animate-pulse-soft" : ""}`}
            style={{
              background:
                phase === "error" ? "var(--bad)" : phase === "ready" ? "var(--ok)" : "var(--accent)",
            }}
          />
          <h3 className="text-sm font-medium truncate">
            {project.name} — website
          </h3>
          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            {phase === "generating"
              ? `${PHASE_LABEL[phase]} ${doneCount}/${plan.length}`
              : phase === "error"
                ? errorMsg ?? PHASE_LABEL.error
                : PHASE_LABEL[phase]}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {files.length > 0 && (
            <button
              onClick={downloadZip}
              className="text-xs px-2.5 py-1 rounded"
              style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
            >
              Download zip
            </button>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-2.5 py-1 rounded"
              style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
            >
              Open ↗
            </a>
          )}
          {!busy && (
            <button
              onClick={() => {
                setUrl(null);
                setFiles([]);
                setLogs([]);
                setErrorMsg(null);
                setSelectedPath(null);
                setRebuildNonce((n) => n + 1);
              }}
              className="text-xs px-2.5 py-1 rounded"
              style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
            >
              Rebuild
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded"
            style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
          >
            <span className="flex items-center gap-1">
              Close <Icon name="close" size={10} strokeWidth={2} />
            </span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex">
        {/* File tree */}
        <div
          className="w-60 shrink-0 overflow-y-auto py-2"
          style={{ borderRight: "1px solid var(--line)", background: "var(--panel-2)" }}
        >
          {plan.map((f) => {
            const st = statuses[f.path] ?? "pending";
            const active = selectedPath === f.path;
            return (
              <button
                key={f.path}
                onClick={() => setSelectedPath(active ? null : f.path)}
                disabled={st !== "done"}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] font-mono truncate disabled:opacity-50"
                style={{
                  color: active ? "var(--accent)" : "var(--foreground)",
                  background: active ? "var(--panel)" : "transparent",
                }}
                title={f.purpose}
              >
                {st === "done" ? (
                  <span style={{ color: "var(--ok)" }}>✓</span>
                ) : st === "generating" ? (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border-2 animate-spin shrink-0"
                    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                  />
                ) : (
                  <span style={{ color: "var(--muted)" }}>·</span>
                )}
                <span className="truncate">{f.path.replace(/^src\//, "")}</span>
              </button>
            );
          })}
          {plan.length === 0 && (
            <p className="px-3 py-2 text-[11px]" style={{ color: "var(--muted)" }}>
              Deriving the file plan from your blueprint…
            </p>
          )}
        </div>

        {/* Preview / code */}
        <div className="flex-1 min-w-0 relative" style={{ background: "#fff" }}>
          {selected ? (
            <pre
              className="absolute inset-0 overflow-auto p-4 text-[12px] leading-relaxed whitespace-pre-wrap font-mono"
              style={{ color: "var(--foreground)", background: "var(--panel)" }}
            >
              {selected.code}
            </pre>
          ) : url ? (
            <iframe
              title="Generated website"
              src={url}
              className="w-full h-full border-0"
              {...({ credentialless: "true" } as Record<string, string>)}
              allow="cross-origin-isolated"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: "var(--panel)" }}>
              <div className="text-center max-w-sm">
                {phase === "error" ? (
                  <>
                    <div className="text-sm mb-1">Site build failed</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{errorMsg}</div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center mb-3">
                      <span
                        className="inline-block h-5 w-5 rounded-full border-2 animate-spin"
                        style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                      />
                    </div>
                    <div className="text-sm mb-1">
                      {phase === "generating"
                        ? `Writing ${doneCount + 1 > plan.length ? plan.length : doneCount + 1} of ${plan.length} files`
                        : PHASE_LABEL[phase]}
                    </div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      Pegasus is building the full site from your blueprint — pages, components,
                      routing and mock data. First run installs dependencies (~30s).
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logs */}
      {logs.length > 0 && phase !== "ready" && (
        <div
          ref={logRef}
          className="h-24 overflow-auto px-4 py-2 text-[10px] leading-relaxed font-mono shrink-0"
          style={{ borderTop: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--muted)" }}
        >
          {logs.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap">{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
