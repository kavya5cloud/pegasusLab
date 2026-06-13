"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { signOut as oauthSignOut } from "next-auth/react";
import { getUser, signIn, signOut, type SessionUser } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/auth?next=%2Fsettings");
      return;
    }
    setUser(u);
    setName(u.name);
    setEmail(u.email);
    // Load stored tokens from localStorage (client-side only config)
    if (typeof window !== "undefined") {
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
      if (apiKey.trim()) localStorage.setItem("pegasus_anthropic_key", apiKey.trim());
      else localStorage.removeItem("pegasus_anthropic_key");
      if (githubToken.trim()) localStorage.setItem("pegasus_github_token", githubToken.trim());
      else localStorage.removeItem("pegasus_github_token");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
            <Image
              src="/pegasuslogo.png"
              alt="pegasus lab."
              width={76}
              height={64}
              className="h-10 w-auto -my-2"
              priority
            />
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-[12px]" style={{ color: "var(--ink-muted)" }}>
            <Link href="/projects" className="hover:text-black">Dashboard</Link>
            <Link href="/pricing" className="hover:text-black">Pricing</Link>
            <button
              onClick={() => { signOut(); oauthSignOut({ callbackUrl: "/" }); }}
              className="hover:text-black"
            >
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
          <h1 className="serif text-4xl mb-1">Settings</h1>
          <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
            Manage your account and API keys.
          </p>
        </header>

        <form onSubmit={save} className="space-y-6">
          {/* Profile */}
          <section
            className="bg-white rounded-2xl border p-6 space-y-4"
            style={{ borderColor: "var(--hairline)" }}
          >
            <h2 className="text-[13px] font-semibold">Profile</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-black transition-colors"
                  style={{ borderColor: "var(--hairline)" }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>
                  Email
                </label>
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

          {/* API keys */}
          <section
            className="bg-white rounded-2xl border p-6 space-y-4"
            style={{ borderColor: "var(--hairline)" }}
          >
            <div>
              <h2 className="text-[13px] font-semibold">API keys</h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                Stored only in your browser — never sent to our servers.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>
                  Anthropic API key
                </label>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                  placeholder="sk-ant-…"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none font-mono focus:border-black transition-colors"
                  style={{ borderColor: "var(--hairline)" }}
                />
                <p className="text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>
                  Used for blueprint generation and code output.{" "}
                  <a
                    href="https://console.anthropic.com/account/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-black"
                  >
                    Get yours →
                  </a>
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>
                  GitHub personal access token
                </label>
                <input
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  type="password"
                  placeholder="ghp_…"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none font-mono focus:border-black transition-colors"
                  style={{ borderColor: "var(--hairline)" }}
                />
                <p className="text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>
                  Required to push builds to GitHub. Needs <code className="font-mono">repo</code> scope.
                </p>
              </div>
            </div>
          </section>

          {/* Plan */}
          <section
            className="bg-white rounded-2xl border p-6"
            style={{ borderColor: "var(--hairline)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold">Plan</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                  You are on the <strong>Hobby</strong> plan.
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

          {/* Danger zone */}
          <section
            className="bg-white rounded-2xl border p-6"
            style={{ borderColor: "var(--hairline)" }}
          >
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
                <Icon name="check" size={13} strokeWidth={2.4} /> Saved
              </span>
            )}
            <button
              type="submit"
              className="bg-black hover:bg-neutral-800 text-white text-[13px] font-medium rounded-xl px-6 py-2.5 transition-colors"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
