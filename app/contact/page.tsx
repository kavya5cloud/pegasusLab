"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/icons";
import { getUser } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

const TEAM_SIZES = ["Just me", "2–10", "11–50", "51–200", "200+"];

export default function ContactSalesPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState("2–10");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u) {
      setName(u.name);
      setEmail(u.email);
    }
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    // No backend yet — acknowledge locally. Wire to a CRM/email endpoint later.
    setSubmitted(true);
  }

  return (
    <main className="flex-1 flex flex-col" style={{ background: "var(--paper)" }}>
      {/* Sky hero with nav */}
      <section className="sky-hero relative mx-3 mt-3 rounded-3xl overflow-hidden">
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
          <div className="flex items-center gap-4 md:gap-7 text-[13px] text-white/80">
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/auth" className="hover:text-white">Sign in</Link>
            <ThemeToggle color="rgba(255,255,255,0.85)" />
            <Link
              href="/auth?mode=signup"
              className="text-[13px] font-medium bg-white text-black rounded-full px-4 py-1.5 hover:bg-white/90"
            >
              Get started
            </Link>
          </div>
        </nav>

        <div className="relative z-10 text-center px-6 pt-10 pb-20 md:pt-14 md:pb-24 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-black/35 backdrop-blur text-white/90 text-[11px] font-mono uppercase tracking-widest rounded-full px-3 py-1 mb-7">
            <Icon name="logo" size={10} strokeWidth={2.4} /> Talk to us
          </div>
          <h1 className="serif text-white text-5xl md:text-6xl leading-[1.05] mb-5">
            Let&apos;s build your
            <br />
            <span className="text-white/65">team&apos;s workspace.</span>
          </h1>
          <p className="text-white/85 text-[15px] leading-relaxed max-w-md mx-auto">
            Tell us about your team and what you&apos;re building. We&apos;ll get you set up with the right plan — usually within a day.
          </p>
        </div>
      </section>

      {/* Form card */}
      <div className="max-w-xl mx-auto w-full px-6 pb-20 -mt-12 relative z-10">
        <div
          className="bg-white rounded-2xl border p-7 shadow-sm"
          style={{ borderColor: "var(--hairline)" }}
        >
          {submitted ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4" style={{ color: "#2563eb" }}>
                <Icon name="check" size={32} strokeWidth={2.2} />
              </div>
              <h2 className="serif text-3xl mb-2">Thanks, {name.split(" ")[0]}.</h2>
              <p className="text-[14px] leading-relaxed mb-6" style={{ color: "var(--ink-muted)" }}>
                Your message is on its way. We&apos;ll reach out at{" "}
                <span className="font-medium" style={{ color: "var(--ink)" }}>{email}</span> shortly.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-[13px] font-medium rounded-full px-5 py-2.5 border hover:border-black transition-colors"
                style={{ borderColor: "var(--hairline)" }}
              >
                Back to pricing
                <Icon name="arrow-right" size={12} strokeWidth={2.2} />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: "var(--hairline)" }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>
                    Work email
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="you@company.com"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: "var(--hairline)" }}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>
                    Company
                  </label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company name"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: "var(--hairline)" }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>
                    Team size
                  </label>
                  <select
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors bg-white"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    {TEAM_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-muted)" }}>
                  What are you building?
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Tell us about your team and what you'd like to build with Pegasus…"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                  style={{ borderColor: "var(--hairline)" }}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[14px] font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
              >
                Send message
                <Icon name="arrow-right" size={13} strokeWidth={2.2} />
              </button>
              <p className="text-[11px] text-center" style={{ color: "var(--ink-muted)" }}>
                Prefer email? Reach us at{" "}
                <a href="mailto:hello@pegasuslab.ai" className="underline hover:text-black">
                  hello@pegasuslab.ai
                </a>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer
        className="border-t py-8 flex flex-col items-center gap-1 text-[11px]"
        style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
      >
        <Image
          src="/pegasuslogo.png"
          alt="pegasus lab."
          width={100}
          height={84}
          className="-my-3"
        />
        the intelligence layer between ideas and software
      </footer>
    </main>
  );
}
