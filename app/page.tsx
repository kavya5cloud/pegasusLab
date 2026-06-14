"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import BlueprintPreview from "@/components/BlueprintPreview";
import { getUser } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

const STACK = ["GitHub", "Figma", "Next.js", "React", "PostgreSQL", "Stripe"];

export default function Landing() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function go(withPrompt?: string) {
    const next = withPrompt
      ? `/projects?prompt=${encodeURIComponent(withPrompt)}`
      : "/projects";
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
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle color="rgba(255,255,255,0.85)" />
            <Link href="/auth" className="text-[13px] text-white/90 hover:text-white">Sign in</Link>
            <Link href="/auth?mode=signup" className="text-[13px] font-medium bg-white text-black rounded-full px-4 py-1.5 hover:bg-white/90">
              Get started
            </Link>
          </div>
        </nav>

        {/* Hero */}
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

          {/* Prompt card */}
          <form
            onSubmit={(e) => { e.preventDefault(); go(prompt.trim() || undefined); }}
            className="mt-9 w-full max-w-md bg-white rounded-2xl shadow-xl p-4 text-left"
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to build…"
              className="w-full text-[13px] outline-none placeholder:text-neutral-400 text-neutral-900 bg-transparent"
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] font-medium border rounded-md px-1.5 py-0.5 text-neutral-500" style={{ borderColor: "var(--hairline)" }}>
                pegasus lab.
              </span>
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1.5" aria-label="Start building">
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
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">Works with</span>
          {STACK.map((l) => (
            <span key={l} className="text-[13px] font-semibold tracking-tight">{l}</span>
          ))}
        </div>
      </section>

      {/* Product preview */}
      <section className="max-w-4xl mx-auto w-full px-6 -mt-14 md:-mt-20 relative z-20">
        <BlueprintPreview />
        <p className="text-center text-[12px] mt-4" style={{ color: "var(--ink-muted)" }}>
          A complete Product Blueprint — PRD, architecture, schema, APIs, and gaps — generated before a line of code is written.
        </p>
      </section>

      {/* Credibility band */}
      <section className="max-w-4xl mx-auto w-full px-6 pt-14">
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border"
          style={{ borderColor: "var(--hairline)", background: "var(--hairline)" }}
        >
          {[
            ["10", "blueprint sections"],
            ["8", "input types accepted"],
            ["Auto", "intelligence routing"],
            ["1-click", "ship to GitHub"],
          ].map(([stat, label]) => (
            <div key={label} className="bg-white px-5 py-6 text-center">
              <div className="serif text-3xl md:text-4xl">{stat}</div>
              <div className="text-[11px] mt-1 leading-snug" style={{ color: "var(--ink-muted)" }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border px-6 py-5 flex items-center gap-4" style={{ borderColor: "var(--hairline)", background: "white" }}>
          <span className="shrink-0" style={{ color: "var(--ink)" }}>
            <Icon name="service" size={20} strokeWidth={1.6} />
          </span>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--ink)" }}>Intelligence routing.</span>{" "}
            Pegasus automatically selects the best model for each task — understanding,
            architecture design, code generation, testing, and validation — without requiring
            you to choose a model. Your code and designs are never used to train anyone&apos;s model.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-4xl mx-auto w-full px-6 py-16 md:py-20">
        <h2 className="serif text-3xl text-center mb-12">From whiteboard to production.</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8">
          {[
            ["Gather", "Drop screenshots, Figma files, GitHub repos, docs, voice notes, requirements, and conversations onto the board."],
            ["Understand", "Pegasus orchestrates your context — reading intent across every input type and resolving conflicts."],
            ["Blueprint", "A complete Product Blueprint is generated: PRD, flows, schema, APIs, architecture, infra, CI/CD, testing, and deployment."],
            ["Validate", "Every implementation is validated against the blueprint before a line of code is written. The blueprint is the single source of truth."],
            ["Ship", "Close gaps with production-ready code and push straight to GitHub. The blueprint stays live as your project evolves."],
          ].map(([title, body], i) => (
            <div key={title}>
              <div className="text-[11px] font-mono text-neutral-400 mb-2">0{i + 1}</div>
              <h3 className="serif text-xl mb-2">{title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-4xl mx-auto w-full px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "blueprint",
              title: "Complete Product Blueprint",
              body: "Before any code is written, Pegasus produces a 10-section blueprint: PRD, user flows, database schema, API architecture, frontend and backend plans, infrastructure, CI/CD pipeline, testing strategy, and deployment plan.",
            },
            {
              icon: "service",
              title: "Project Memory",
              body: "Pegasus continuously stores and updates your project context — core purpose, target users, constraints, technical decisions, and open questions. Nothing is forgotten between sessions.",
            },
            {
              icon: "bolt",
              title: "Intelligence Routing",
              body: "Each task is automatically routed to the best model. Understanding and architecture get Opus. Code generation gets Sonnet. Documentation gets Haiku. You never pick a model.",
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="rounded-2xl border p-6" style={{ borderColor: "var(--hairline)", background: "white" }}>
              <span className="inline-flex mb-4" style={{ color: "var(--ink-muted)" }}>
                <Icon name={icon} size={18} strokeWidth={1.6} />
              </span>
              <h3 className="serif text-xl mb-2">{title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto w-full px-6 pb-20">
        <div className="sky-hero relative rounded-3xl overflow-hidden px-8 py-14 text-center">
          <div className="relative z-10">
            <h2 className="serif text-white text-4xl md:text-5xl mb-4 leading-[1.06]">
              Hand Pegasus your whiteboard.
              <br />
              <span className="text-white/65">Receive production software.</span>
            </h2>
            <p className="text-white/75 text-[14px] mb-8">
              Complete Product Blueprint before a single line of code. Free to start.
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

      <footer className="border-t py-8 flex flex-col items-center gap-4 text-[11px]" style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}>
        <Image src="/pegasuslogo.png" alt="pegasus lab." width={100} height={84} className="-my-3" />
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="hover:text-black">Pricing</Link>
          <Link href="/contact" className="hover:text-black">Contact</Link>
          <Link href="/auth" className="hover:text-black">Sign in</Link>
          <Link href="/auth?mode=signup" className="hover:text-black">Get started</Link>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/pegasuslab" target="_blank" rel="noreferrer" aria-label="GitHub" className="hover:text-black">
            <Icon name="github" size={15} strokeWidth={1.8} />
          </a>
          <a href="https://x.com/pegasuslab" target="_blank" rel="noreferrer" aria-label="X" className="text-[13px] font-semibold hover:text-black">𝕏</a>
        </div>
        <span>context orchestration — the intelligence layer between ideas and software</span>
      </footer>
    </main>
  );
}
