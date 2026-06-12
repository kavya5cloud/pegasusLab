"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { getUser } from "@/lib/auth";

const LOGOS = ["Northbeam", "Quill", "Hexa", "Lumen", "Drift", "Orbit"];

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
              className="brightness-0 invert h-14 w-auto -my-4"
            />
          </Link>
          <div className="hidden md:flex items-center gap-7 text-[13px] text-white/80">
            <a href="#how" className="hover:text-white">Platform</a>
            <a href="#how" className="hover:text-white">Blueprint</a>
            <a href="#how" className="hover:text-white">Pricing</a>
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
              <Image
                src="/pegasuslogo.png"
                alt="pegasus lab."
                width={66}
                height={55}
                className="-my-2.5 -ml-1.5"
              />
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

        {/* Logo strip */}
        <div className="relative z-10 flex items-center justify-center gap-8 md:gap-12 flex-wrap px-6 pb-8 text-white/75">
          {LOGOS.map((l) => (
            <span key={l} className="text-[13px] font-semibold tracking-tight">
              {l}
            </span>
          ))}
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

      <footer
        className="border-t py-8 flex flex-col items-center gap-1 text-[11px]"
        style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
      >
        <Image
          src="/pegasuslogo.png"
          alt="pegasus lab."
          width={130}
          height={109}
          className="-my-4"
        />
        the intelligence layer between ideas and software
      </footer>
    </main>
  );
}
