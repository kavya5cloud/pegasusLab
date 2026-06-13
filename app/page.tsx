"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import BlueprintPreview from "@/components/BlueprintPreview";
import { getUser } from "@/lib/auth";

const STACK = ["GitHub", "Figma", "Next.js", "React", "PostgreSQL", "Stripe"];

export default function Landing() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function go(withPrompt?: string) {
    const next = withPrompt
      ? `/projects?prompt=${encodeURIComponent(withPrompt)}`
      : "/projects";
    // Always route through sign-in; it forwards straight to the dashboard
    // when a session already exists.
    if (getUser()) router.push(next);
    else router.push(`/auth?next=${encodeURIComponent(next)}`);
  }

  return (
    <main className="flex-1 flex flex-col" style={{ background: "var(--paper)" }}>
      {/* Sky hero */}
      <section className="sky-hero relative mx-3 mt-3 rounded-3xl overflow-hidden">
        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5">
          <Link href="/" className="flex items-center text-white">
            {/* brightness-0 + invert renders the black lockup white on the sky */}
            <Image
              src="/pegasuslogo.png"
              alt="pegasus lab."
              width={110}
              height={92}
              priority
              className="brightness-0 invert h-20 w-auto -my-6"
            />
          </Link>
          <div className="hidden md:flex items-center gap-7 text-[13px] text-white/80">
            <a href="#how" className="hover:text-white">Platform</a>
            <a href="#how" className="hover:text-white">Blueprint</a>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <a href="#how" className="hover:text-white">Docs</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-[13px] text-white/90 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/auth?mode=signup"
              className="text-[13px] font-medium bg-white text-black rounded-full px-4 py-1.5 hover:bg-white/90"
            >
              Get started
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="flex items-center gap-2 bg-black/35 backdrop-blur text-white/90 text-[11px] rounded-full pl-1.5 pr-3 py-1 mb-8">
            <span className="bg-white text-black rounded-full p-0.5">
              <Icon name="logo" size={10} strokeWidth={2.4} />
            </span>
            Whiteboard in. Working app out.
          </div>

          <h1 className="serif text-white text-5xl md:text-7xl leading-[1.04] max-w-3xl">
            Build Smarter.
            <br />
            Ship Faster. <span className="text-white/65">With AI.</span>
          </h1>
          <p className="text-white/85 text-sm md:text-[15px] max-w-md mt-5 leading-relaxed">
            Pegasus turns scattered ideas, code, designs and docs into a living
            blueprint of your application — then writes the code that completes it.
          </p>

          {/* Mini prompt card */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go(prompt.trim() || undefined);
            }}
            className="mt-9 w-full max-w-md bg-white rounded-2xl shadow-xl p-4 text-left"
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should Pegasus build for you?"
              className="w-full text-[13px] outline-none placeholder:text-neutral-400 text-neutral-900 bg-transparent"
            />
            <div className="flex items-center justify-between mt-4">
              <span
                className="text-[10px] font-medium border rounded-md px-1.5 py-0.5 text-neutral-500"
                style={{ borderColor: "var(--hairline)" }}
              >
                pegasus lab.
              </span>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1.5"
                aria-label="Start building"
              >
                <Icon name="arrow-right" size={13} strokeWidth={2.2} />
              </button>
            </div>
          </form>

          <button
            onClick={() => go()}
            className="mt-6 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl px-6 py-3 shadow-lg ring-4 ring-white/30"
          >
            Start your first build — free
          </button>
        </div>

        {/* Integrations strip */}
        <div className="relative z-10 flex items-center justify-center gap-8 md:gap-12 flex-wrap px-6 pb-8 text-white/75">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
            Works with
          </span>
          {STACK.map((l) => (
            <span key={l} className="text-[13px] font-semibold tracking-tight">
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* Product preview — show the magic */}
      <section className="max-w-4xl mx-auto w-full px-6 -mt-14 md:-mt-20 relative z-20">
        <BlueprintPreview />
        <p className="text-center text-[12px] mt-4" style={{ color: "var(--ink-muted)" }}>
          A real Pegasus blueprint — every page, API, table and the gaps between them, mapped in seconds.
        </p>
      </section>

      {/* Credibility band — honest, verifiable signals */}
      <section className="max-w-4xl mx-auto w-full px-6 pt-14">
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border"
          style={{ borderColor: "var(--hairline)", background: "var(--hairline)" }}
        >
          {[
            ["8", "component types mapped"],
            ["4", "gap severity levels"],
            ["3", "AI backends, bring your own"],
            ["1-click", "ship to GitHub"],
          ].map(([stat, label]) => (
            <div key={label} className="bg-white px-5 py-6 text-center">
              <div className="serif text-3xl md:text-4xl">{stat}</div>
              <div className="text-[11px] mt-1 leading-snug" style={{ color: "var(--ink-muted)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Trust / privacy callout — a real differentiator for developers */}
        <div
          className="mt-5 rounded-2xl border px-6 py-5 flex items-center gap-4"
          style={{ borderColor: "var(--hairline)", background: "white" }}
        >
          <span className="shrink-0" style={{ color: "var(--ink)" }}>
            <Icon name="service" size={20} strokeWidth={1.6} />
          </span>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--ink)" }}>
              Bring your own model.
            </span>{" "}
            Run Pegasus on Anthropic, Groq, or a fully-local Ollama install. Your code and
            designs are never used to train anyone&apos;s model.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-4xl mx-auto w-full px-6 py-16 md:py-20">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">
          {[
            ["Board", "Drop ideas, code snippets, GitHub repos, Figma files and screenshots onto one whiteboard."],
            ["Blueprint", "Pegasus maps every page, API, service and table — and how they connect. Gaps included."],
            ["Code", "Pick a gap. Pegasus generates the production-ready code that closes it."],
            ["Ship", "Push the finished build straight to a GitHub repository — manifest included."],
          ].map(([title, body], i) => (
            <div key={title}>
              <div className="text-[11px] font-mono text-neutral-400 mb-2">0{i + 1}</div>
              <h3 className="serif text-2xl mb-2">{title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature deep-dive */}
      <section className="max-w-4xl mx-auto w-full px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "blueprint",
              title: "Living blueprint",
              body: "Pegasus doesn't just read your prompt — it reads your whole stack. Every node in the graph is classified as existing, partial, or missing, so you see exactly where the gaps are.",
            },
            {
              icon: "bolt",
              title: "Gap intelligence",
              body: "From security holes to missing APIs to UX dead ends, Pegasus surfaces actionable findings ranked by severity — then generates the exact code to close each one.",
            },
            {
              icon: "github",
              title: "Ship straight to GitHub",
              body: "Generated artifacts are bundled into a build manifest and pushed to a new or existing repository in one click. No copy-pasting, no assembly required.",
            },
          ].map(({ icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border p-6"
              style={{ borderColor: "var(--hairline)", background: "white" }}
            >
              <span className="inline-flex mb-4" style={{ color: "var(--ink-muted)" }}>
                <Icon name={icon} size={18} strokeWidth={1.6} />
              </span>
              <h3 className="serif text-xl mb-2">{title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="max-w-4xl mx-auto w-full px-6 pb-20">
        <div className="sky-hero relative rounded-3xl overflow-hidden px-8 py-14 text-center">
          <div className="relative z-10">
            <h2 className="serif text-white text-4xl md:text-5xl mb-4 leading-[1.06]">
              The intelligence layer
              <br />
              <span className="text-white/65">between ideas and software.</span>
            </h2>
            <p className="text-white/75 text-[14px] mb-8">
              Join developers building faster with Pegasus AI — free to start.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => go()}
                className="inline-flex items-center gap-2 bg-white text-black text-[14px] font-semibold rounded-full px-7 py-3 hover:bg-neutral-100"
              >
                Start building free
                <Icon name="arrow-right" size={13} strokeWidth={2.2} />
              </button>
              <Link
                href="/pricing"
                className="text-[14px] font-medium rounded-full px-7 py-3 hover:bg-white/10 transition-colors"
                style={{ color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer
        className="border-t py-8 flex flex-col items-center gap-4 text-[11px]"
        style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
      >
        <Image
          src="/pegasuslogo.png"
          alt="pegasus lab."
          width={100}
          height={84}
          className="-my-3"
        />
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="hover:text-black">Pricing</Link>
          <Link href="/auth" className="hover:text-black">Sign in</Link>
          <Link href="/auth?mode=signup" className="hover:text-black">Get started</Link>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/pegasuslab"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hover:text-black"
          >
            <Icon name="github" size={15} strokeWidth={1.8} />
          </a>
          <a
            href="https://x.com/pegasuslab"
            target="_blank"
            rel="noreferrer"
            aria-label="X"
            className="text-[13px] font-semibold hover:text-black"
          >
            𝕏
          </a>
        </div>
        <span>the intelligence layer between ideas and software</span>
      </footer>
    </main>
  );
}
