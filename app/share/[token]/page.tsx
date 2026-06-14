"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { use } from "react";
import type { Blueprint } from "@/lib/types";

interface SharedData {
  id: string;
  name: string;
  description: string;
  blueprint: Blueprint;
  updatedAt: string;
}

type Section =
  | "overview"
  | "prd"
  | "flows"
  | "database"
  | "api"
  | "frontend"
  | "backend"
  | "infra"
  | "cicd"
  | "testing"
  | "deploy";

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-600">
      {children}
    </span>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 mb-1">{label}</div>
      <div className="text-[12px] leading-relaxed text-neutral-700">{children}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-50 text-red-700 border-red-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    low: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${colors[severity] ?? colors.low}`}>
      {severity}
    </span>
  );
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("overview");

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(async (r) => {
        if (r.ok) setData(await r.json());
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <span className="font-mono text-sm text-neutral-400 animate-pulse">Loading blueprint…</span>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fafaf9]">
        <p className="text-neutral-500">This blueprint is not available or sharing has been disabled.</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Go to Pegasus Lab</Link>
      </main>
    );
  }

  const bp = data.blueprint;

  const sections: [Section, string, boolean][] = [
    ["overview", "Overview", true],
    ["prd", "PRD", !!bp.prd],
    ["flows", "Flows", !!(bp.userFlows?.length)],
    ["database", "Database", !!bp.databaseSchema],
    ["api", "API", !!bp.apiArchitecture],
    ["frontend", "Frontend", !!bp.frontendArchitecture],
    ["backend", "Backend", !!bp.backendArchitecture],
    ["infra", "Infra", !!bp.infrastructurePlan],
    ["cicd", "CI/CD", !!bp.cicdPipeline],
    ["testing", "Testing", !!bp.testingStrategy],
    ["deploy", "Deploy", !!bp.deploymentPlan],
  ];

  return (
    <main className="min-h-screen bg-[#fafaf9] text-neutral-900">
      {/* Header */}
      <nav className="border-b border-neutral-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image src="/pegasuslogo.png" alt="pegasus lab." width={76} height={64} className="h-8 w-auto" />
          </Link>
          <span className="text-neutral-300">/</span>
          <div>
            <span className="text-sm font-medium">{data.name}</span>
            <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 border border-neutral-200">
              read-only
            </span>
          </div>
        </div>
        <Link
          href="/"
          className="text-[12px] font-medium px-4 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 transition-colors"
        >
          Build yours →
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 flex gap-8">
        {/* Sidebar nav */}
        <aside className="w-40 shrink-0 hidden md:block">
          <div className="sticky top-8 space-y-0.5">
            {sections.map(([s, label, has]) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                disabled={!has}
                className="w-full text-left text-[12px] px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: section === s ? "#000" : "transparent",
                  color: section === s ? "#fff" : has ? "#525252" : "#d4d4d4",
                  fontWeight: section === s ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        {/* Mobile section tabs */}
        <div className="md:hidden mb-6 flex flex-wrap gap-1 w-full">
          {sections.filter(([, , has]) => has).map(([s, label]) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors"
              style={{
                background: section === s ? "#000" : "transparent",
                color: section === s ? "#fff" : "#525252",
                borderColor: section === s ? "#000" : "#e5e5e5",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Overview */}
          {section === "overview" && (
            <>
              <div>
                <h1 className="text-2xl font-bold mb-2">{data.name}</h1>
                {data.description && <p className="text-neutral-600 text-sm mb-4">{data.description}</p>}
                <p className="text-[13px] text-neutral-700 leading-relaxed">{bp.summary}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bp.techStack.map((t) => <Tag key={t}>{t}</Tag>)}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {(["existing", "partial", "missing"] as const).map((s) => {
                  const count = bp.nodes.filter((n) => n.status === s).length;
                  const color = s === "existing" ? "#15803d" : s === "partial" ? "#b45309" : "#be123c";
                  return (
                    <div key={s} className="rounded-xl py-3 border border-neutral-200 bg-white">
                      <div className="text-xl font-semibold" style={{ color }}>{count}</div>
                      <div className="text-[9px] font-mono uppercase text-neutral-400 mt-0.5">{s}</div>
                    </div>
                  );
                })}
              </div>
              {bp.gaps.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold mb-3">Gaps & Recommendations</h2>
                  <div className="space-y-3">
                    {bp.gaps.map((g) => (
                      <div key={g.id} className="rounded-xl p-4 bg-white border border-neutral-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={g.severity} />
                          <span className="text-[10px] font-mono text-neutral-400 uppercase">{g.category}</span>
                        </div>
                        <div className="text-[13px] font-semibold">{g.title}</div>
                        <p className="text-[12px] text-neutral-600">{g.description}</p>
                        <p className="text-[11px] text-neutral-500"><strong>Recommendation:</strong> {g.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* PRD */}
          {section === "prd" && bp.prd && (
            <div className="space-y-4 bg-white rounded-2xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold">Product Requirements</h2>
              <Block label="Vision">{bp.prd.vision}</Block>
              <Block label="Problem statement">{bp.prd.problemStatement}</Block>
              <Block label="Target users">
                <ul className="space-y-1 mt-1">{bp.prd.targetUsers.map((u, i) => <li key={i}>· {u}</li>)}</ul>
              </Block>
              <Block label="Core features">
                <div className="space-y-2 mt-1">
                  {bp.prd.coreFeatures.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <Tag>{f.priority}</Tag>
                      <div>
                        <div className="text-[12px] font-medium">{f.name}</div>
                        <div className="text-[11px] text-neutral-500">{f.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Block>
              <Block label="Non-goals">
                <ul className="space-y-1 mt-1">{bp.prd.nonGoals.map((g, i) => <li key={i}>· {g}</li>)}</ul>
              </Block>
              <Block label="Success metrics">
                <ul className="space-y-1 mt-1">{bp.prd.successMetrics.map((m, i) => <li key={i}>· {m}</li>)}</ul>
              </Block>
            </div>
          )}

          {/* User flows */}
          {section === "flows" && bp.userFlows && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">User Flows</h2>
              {bp.userFlows.map((flow) => (
                <div key={flow.id} className="rounded-xl p-5 bg-white border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{flow.name}</span>
                    <span className="text-[10px] font-mono text-neutral-400">{flow.actor}</span>
                  </div>
                  <ol className="space-y-1.5">
                    {flow.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px]">
                        <span className="font-mono text-[10px] text-neutral-400 mt-0.5 shrink-0">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <p className="text-[11px] font-mono text-green-700">→ {flow.outcome}</p>
                </div>
              ))}
            </div>
          )}

          {/* Database */}
          {section === "database" && bp.databaseSchema && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Database Schema</h2>
                <Tag>{bp.databaseSchema.engine}</Tag>
              </div>
              {bp.databaseSchema.entities.map((entity) => (
                <div key={entity.name} className="rounded-xl overflow-hidden border border-neutral-200 bg-white">
                  <div className="px-4 py-2 text-[12px] font-semibold font-mono bg-neutral-50 border-b border-neutral-200">{entity.name}</div>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="px-4 py-1.5 text-left font-mono text-neutral-400">field</th>
                        <th className="px-4 py-1.5 text-left font-mono text-neutral-400">type</th>
                        <th className="px-4 py-1.5 text-left font-mono text-neutral-400">constraints</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entity.fields.map((f) => (
                        <tr key={f.name} className="border-b border-neutral-50">
                          <td className="px-4 py-1.5 font-mono">{f.name}</td>
                          <td className="px-4 py-1.5 font-mono text-blue-600">{f.type}</td>
                          <td className="px-4 py-1.5 text-neutral-500">{f.constraints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* API */}
          {section === "api" && bp.apiArchitecture && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">API Architecture</h2>
                <Tag>{bp.apiArchitecture.style}</Tag>
                <Tag>{bp.apiArchitecture.authStrategy}</Tag>
              </div>
              <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="px-4 py-2 text-left font-mono text-neutral-400">method</th>
                      <th className="px-4 py-2 text-left font-mono text-neutral-400">path</th>
                      <th className="px-4 py-2 text-left font-mono text-neutral-400">description</th>
                      <th className="px-4 py-2 text-left font-mono text-neutral-400">auth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bp.apiArchitecture.endpoints.map((ep, i) => {
                      const methodColor: Record<string, string> = { GET: "#15803d", POST: "#1d4ed8", PUT: "#b45309", PATCH: "#7c3aed", DELETE: "#be123c" };
                      return (
                        <tr key={i} className="border-b border-neutral-50">
                          <td className="px-4 py-1.5 font-mono font-semibold" style={{ color: methodColor[ep.method] ?? "#333" }}>{ep.method}</td>
                          <td className="px-4 py-1.5 font-mono text-neutral-700">{ep.path}</td>
                          <td className="px-4 py-1.5 text-neutral-600">{ep.description}</td>
                          <td className="px-4 py-1.5 text-center">{ep.auth ? "✓" : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {bp.apiArchitecture.rateLimitingNotes && (
                <p className="text-[12px] text-neutral-500">{bp.apiArchitecture.rateLimitingNotes}</p>
              )}
            </div>
          )}

          {/* Frontend */}
          {section === "frontend" && bp.frontendArchitecture && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold">Frontend Architecture</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Framework", bp.frontendArchitecture.framework],
                  ["State", bp.frontendArchitecture.stateManagement],
                  ["Routing", bp.frontendArchitecture.routing],
                  ["Design system", bp.frontendArchitecture.designSystem],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg p-3 bg-neutral-50 border border-neutral-200">
                    <div className="text-[9px] font-mono uppercase text-neutral-400 mb-1">{label}</div>
                    <div className="text-[12px] font-medium">{value}</div>
                  </div>
                ))}
              </div>
              <Block label="Key components">
                <ul className="space-y-1 mt-1">{bp.frontendArchitecture.keyComponents.map((c, i) => <li key={i}>· {c}</li>)}</ul>
              </Block>
            </div>
          )}

          {/* Backend */}
          {section === "backend" && bp.backendArchitecture && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Backend Architecture</h2>
                <Tag>{bp.backendArchitecture.pattern}</Tag>
              </div>
              <div className="space-y-2">
                {bp.backendArchitecture.services.map((s, i) => (
                  <div key={i} className="rounded-xl p-4 bg-white border border-neutral-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-semibold">{s.name}</span>
                      <Tag>{s.tech}</Tag>
                    </div>
                    <p className="text-[12px] text-neutral-600">{s.responsibility}</p>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-neutral-500">{bp.backendArchitecture.scalingNotes}</p>
            </div>
          )}

          {/* Infra */}
          {section === "infra" && bp.infrastructurePlan && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-semibold">Infrastructure</h2>
                <Tag>{bp.infrastructurePlan.provider}</Tag>
                <span className="text-[12px] text-neutral-500">{bp.infrastructurePlan.estimatedMonthlyCost}/mo est.</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {bp.infrastructurePlan.services.map((s, i) => (
                  <div key={i} className="rounded-xl p-3 bg-white border border-neutral-200">
                    <div className="text-[12px] font-semibold">{s.name}</div>
                    <div className="text-[11px] text-neutral-500">{s.purpose}</div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-neutral-500">{bp.infrastructurePlan.scalingApproach}</p>
            </div>
          )}

          {/* CI/CD */}
          {section === "cicd" && bp.cicdPipeline && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">CI/CD Pipeline</h2>
                <Tag>{bp.cicdPipeline.provider}</Tag>
              </div>
              <Block label="Stages">
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {bp.cicdPipeline.stages.map((s, i) => (
                    <>
                      <Tag key={s}>{s}</Tag>
                      {i < bp.cicdPipeline!.stages.length - 1 && <span className="text-neutral-300 text-xs">→</span>}
                    </>
                  ))}
                </div>
              </Block>
              <Block label="Deployment strategy">{bp.cicdPipeline.deploymentStrategy}</Block>
              <Block label="Environments">
                <div className="flex gap-1.5 mt-1">{bp.cicdPipeline.environments.map((e) => <Tag key={e}>{e}</Tag>)}</div>
              </Block>
            </div>
          )}

          {/* Testing */}
          {section === "testing" && bp.testingStrategy && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold">Testing Strategy</h2>
              <Block label="Unit testing">{bp.testingStrategy.unit}</Block>
              <Block label="Integration scenarios">
                <ul className="space-y-1 mt-1">{bp.testingStrategy.integrationScenarios.map((s, i) => <li key={i}>· {s}</li>)}</ul>
              </Block>
              <Block label="E2E scenarios">
                <ul className="space-y-1 mt-1">{bp.testingStrategy.e2eScenarios.map((s, i) => <li key={i}>· {s}</li>)}</ul>
              </Block>
              <Block label="Performance targets">{bp.testingStrategy.performanceTargets}</Block>
            </div>
          )}

          {/* Deploy */}
          {section === "deploy" && bp.deploymentPlan && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Deployment Plan</h2>
              {bp.deploymentPlan.environments.map((env, i) => (
                <div key={i} className="rounded-xl p-4 bg-white border border-neutral-200">
                  <div className="text-[12px] font-semibold mb-1">{env.name}</div>
                  <p className="text-[12px] text-neutral-600">{env.config}</p>
                </div>
              ))}
              <Block label="Rollout strategy">{bp.deploymentPlan.rolloutStrategy}</Block>
              <Block label="Monitoring">{bp.deploymentPlan.monitoring}</Block>
              <Block label="Rollback plan">{bp.deploymentPlan.rollbackPlan}</Block>
            </div>
          )}

          {/* Footer */}
          <div className="pt-8 border-t border-neutral-200 text-center">
            <p className="text-[11px] text-neutral-400">
              Built with{" "}
              <Link href="/" className="underline hover:text-neutral-600">pegasus lab.</Link>
              {" · "}Updated {new Date(data.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
