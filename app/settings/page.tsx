"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { signOut as oauthSignOut } from "next-auth/react";
import { getUser, signIn, signOut, type SessionUser } from "@/lib/auth";

function KeyInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  hintHref,
  badge,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  hintHref?: string;
  badge?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
          {label}
        </label>
        {badge && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}>
            {badge}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none font-mono focus:border-black transition-colors pr-10"
          style={{ borderColor: "var(--hairline)" }}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
          style={{ color: "var(--ink-muted)" }}
        >
          {show ? "hide" : "show"}
        </button>
      </div>
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>
          {hint}{" "}
          {hintHref && (
            <a href={hintHref} target="_blank" rel="noreferrer" className="underline hover:text-black">
              Get yours →
            </a>
          )}
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [setup, setSetup] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/auth?next=%2Fsettings");
      return;
    }
    setUser(u);
    setName(u.name);
    setEmail(u.email);
    const params = new URLSearchParams(window.location.search);
    setSetup(params.get("setup") === "1");
    if (typeof window !== "undefined") {
      setGoogleKey(localStorage.getItem("pegasus_google_key") ?? "");
      setOllamaUrl(localStorage.getItem("pegasus_ollama_url") ?? "");
      setOllamaModel(localStorage.getItem("pegasus_ollama_model") ?? "");
      setApiKey(localStorage.getItem("pegasus_anthropic_key") ?? "");
      setGithubToken(localStorage.getItem("pegasus_github_token") ?? "");
    }
  }, [router]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const updated = { name: name.trim() || user.name, email: email.trim() || user.email };
    signIn(updated);
    setUser(updated);
    if (typeof window !== "undefined") {
      const set = (k: string, v: string) => v.trim() ? localStorage.setItem(k, v.trim()) : localStorage.removeItem(k);
      set("pegasus_google_key", googleKey);
      set("pegasus_ollama_url", ollamaUrl);
      set("pegasus_ollama_model", ollamaModel);
      set("pegasus_anthropic_key", apiKey);
      set("pegasus_github_token", githubToken);
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); if (setup) router.push("/projects"); }, 1800);
  }

  if (!user) {
    return <main className="flex-1 min-h-screen" style={{ background: "var(--paper)" }} />;
  }

  return (
    <main className="flex-1 min-h-screen flex flex-col" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-center pt-8">
        <div
          className="flex items-center gap-6 bg-white rounded-full pl-3 pr-2 py-1.5 shadow-sm border"
          style={{ borderColor: "var(--hairline)" }}
        >
          <Link href="/" className="flex items-center">
            <Image src="/pegasuslogo.png" alt="pegasus lab." width={76} height={64} className="h-10 w-auto -my-2" priority />
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-[12px]" style={{ color: "var(--ink-muted)" }}>
            <Link href="/projects" className="hover:text-black">Dashboard</Link>
            <Link href="/pricing" className="hover:text-black">Pricing</Link>
            <button onClick={() => { signOut(); oauthSignOut({ callbackUrl: "/" }); }} className="hover:text-black">
              Sign out
            </button>
          </div>
          <Link href="/projects" className="bg-black text-white text-[12px] rounded-full px-4 py-1.5">
            My builds
          </Link>
        </div>
      </nav>

      <div className="max-w-xl w-full mx-auto px-6 py-12">
        <header className="mb-8">
          <h1 className="serif text-4xl mb-1">{setup ? "Set up your AI" : "Settings"}</h1>
          <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
            {setup
              ? "Add a Gemini API key (free) or point to your local Ollama to activate the AI engine."
              : "Manage your account and AI keys."}
          </p>
        </header>

        <form onSubmit={save} className="space-y-6">

          {/* ── AI keys — Gemini first ── */}
          <section className="bg-white rounded-2xl border p-6 space-y-5" style={{ borderColor: "var(--hairline)" }}>
            <div>
              <h2 className="text-[13px] font-semibold">AI engine</h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                Keys are stored only in your browser — never sent to our servers. Pegasus uses whichever key you provide.
              </p>
            </div>

            {/* Gemini — recommended free tier */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="#10b981" />
                </svg>
                <span className="text-[12px] font-semibold" style={{ color: "#059669" }}>Recommended free option</span>
              </div>
              <KeyInput
                label="Google Gemini API key"
                badge="Free tier"
                value={googleKey}
                onChange={setGoogleKey}
                placeholder="AIza…"
                hint="Gemini 2.0 Flash — generous free quota, no credit card required."
                hintHref="https://aistudio.google.com/apikey"
              />
            </div>

            {/* Ollama */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold">Ollama (local, fully private)</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                  100% free
                </span>
              </div>
              <KeyInput
                label="Ollama base URL"
                value={ollamaUrl}
                onChange={setOllamaUrl}
                placeholder="http://localhost:11434/v1"
                hint="Leave blank to use the env default. Your model must support JSON output."
              />
              <KeyInput
                label="Ollama model"
                value={ollamaModel}
                onChange={setOllamaModel}
                placeholder="llama3.1"
                hint="e.g. llama3.1, mistral, qwen2.5-coder. Must be pulled first."
              />
            </div>

            {/* Anthropic — advanced */}
            <details className="group">
              <summary className="text-[12px] cursor-pointer list-none flex items-center gap-1" style={{ color: "var(--ink-muted)" }}>
                <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
                Anthropic Claude (advanced — paid)
              </summary>
              <div className="mt-3">
                <KeyInput
                  label="Anthropic API key"
                  value={apiKey}
                  onChange={setApiKey}
                  placeholder="sk-ant-…"
                  hint="Uses Claude Opus for blueprints and Claude Sonnet for code — highest quality but requires a paid plan."
                  hintHref="https://console.anthropic.com/account/keys"
                />
              </div>
            </details>
          </section>

          {/* Profile */}
          <section className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--hairline)" }}>
            <h2 className="text-[13px] font-semibold">Profile</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-black transition-colors"
                  style={{ borderColor: "var(--hairline)" }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-black transition-colors"
                  style={{ borderColor: "var(--hairline)" }}
                />
              </div>
            </div>
          </section>

          {/* GitHub */}
          <section className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--hairline)" }}>
            <div>
              <h2 className="text-[13px] font-semibold">GitHub</h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-muted)" }}>Required to push generated code to GitHub.</p>
            </div>
            <KeyInput
              label="Personal access token"
              value={githubToken}
              onChange={setGithubToken}
              placeholder="ghp_…"
              hint="Needs repo scope."
            />
          </section>

          {/* Plan */}
          <section className="bg-white rounded-2xl border p-6" style={{ borderColor: "var(--hairline)" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold">Plan</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                  You are on the <strong>Hobby</strong> plan — free forever with your own key.
                </p>
              </div>
              <Link
                href="/pricing"
                className="text-[12px] font-medium rounded-full px-4 py-1.5 border hover:bg-black hover:text-white hover:border-black transition-colors"
                style={{ borderColor: "var(--hairline)" }}
              >
                Upgrade
              </Link>
            </div>
          </section>

          {/* Account */}
          <section className="bg-white rounded-2xl border p-6" style={{ borderColor: "var(--hairline)" }}>
            <h2 className="text-[13px] font-semibold mb-3">Account</h2>
            <button
              type="button"
              onClick={() => { signOut(); oauthSignOut({ callbackUrl: "/" }); }}
              className="text-[13px] rounded-xl border px-4 py-2 hover:border-red-400 hover:text-red-600 transition-colors"
              style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
            >
              Sign out
            </button>
          </section>

          {/* Save */}
          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="text-[13px] flex items-center gap-1" style={{ color: "#15803d" }}>
                <Icon name="check" size={13} strokeWidth={2.4} />
                {setup ? "Saved — taking you to your builds" : "Saved"}
              </span>
            )}
            <button
              type="submit"
              className="bg-black hover:bg-neutral-800 text-white text-[13px] font-medium rounded-xl px-6 py-2.5 transition-colors"
            >
              {setup ? "Save and continue →" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
