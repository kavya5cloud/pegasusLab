"use client";

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { getUser } from "@/lib/auth";

const PLANS = [
  {
    name: "Hobby",
    price: "Free",
    period: "",
    description: "For solo developers exploring what's possible.",
    features: [
      "3 active builds",
      "Blueprint generation",
      "AI gap detection",
      "Code generation (5 gaps/mo)",
      "Download artifacts",
      "Community support",
    ],
    cta: "Start building free",
    href: "/auth?mode=signup&next=%2Fprojects",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For developers who ship seriously.",
    features: [
      "Unlimited builds",
      "Unlimited blueprint rebuilds",
      "AI gap detection + chat",
      "Unlimited code generation",
      "GitHub push to any repo",
      "Priority model access",
      "Email support",
    ],
    cta: "Get started",
    href: "/auth?mode=signup&plan=pro",
    highlight: true,
  },
  {
    name: "Team",
    price: "$79",
    period: "/month",
    description: "For teams building together.",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Shared project workspace",
      "Blueprint history & versions",
      "Slack integration",
      "SSO (SAML)",
      "Dedicated support",
    ],
    cta: "Talk to us",
    href: "/contact",
    highlight: false,
  },
];

const FAQS = [
  {
    q: "Do I need my own AI API key?",
    a: "No — on Pro and Team, we provide AI access out of the box. On Hobby, you can plug in your own backend: Anthropic (Claude), Groq (free, open-source models), or a fully local Ollama install — or just use demo mode to explore the UI.",
  },
  {
    q: "What counts as a \"gap\"?",
    a: "A gap is a missing feature, broken integration, architecture risk, or UX hole that Pegasus detects in your blueprint. Each gap can be closed by generating code.",
  },
  {
    q: "Can I export everything?",
    a: "Yes. You can download a full markdown bundle of all generated artifacts at any time, or push directly to a GitHub repository you own.",
  },
  {
    q: "Is my code stored on your servers?",
    a: "Your whiteboard content and generated artifacts are stored on our servers so the product works across sessions. We never train on your data.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your settings page — your data stays accessible on the Hobby plan.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") setWelcome(true);
  }, []);

  function handleCta(href: string) {
    if (href === "/contact") { router.push(href); return; }
    if (getUser()) {
      router.push("/projects");
    } else {
      router.push(href);
    }
  }

  return (
    <main className="flex-1 flex flex-col" style={{ background: "var(--paper)" }}>
      {/* Sky hero with nav */}
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
          <div className="flex items-center gap-4 md:gap-7 text-[13px] text-white/80">
            <Link href="/" className="hidden md:inline hover:text-white">Platform</Link>
            <Link href="/auth" className="hover:text-white">Sign in</Link>
            <Link
              href="/auth?mode=signup"
              className="text-[13px] font-medium bg-white text-black rounded-full px-4 py-1.5 hover:bg-white/90"
            >
              Get started
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 pt-10 pb-20 md:pt-14 md:pb-24 max-w-2xl mx-auto">
          {welcome ? (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white text-[13px] font-medium rounded-full px-4 py-1.5 mb-7">
              🎉 Account created — pick your plan to get started
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-black/35 backdrop-blur text-white/90 text-[11px] font-mono uppercase tracking-widest rounded-full px-3 py-1 mb-7">
              <Icon name="bolt" size={10} strokeWidth={2} /> Transparent pricing
            </div>
          )}
          <h1 className="serif text-white text-5xl md:text-6xl leading-[1.05] mb-5">
            {welcome ? (
              <>Welcome to<br /><span className="text-white/65">pegasus lab.</span></>
            ) : (
              <>Start free.<br /><span className="text-white/65">Scale when you ship.</span></>
            )}
          </h1>
          <p className="text-white/85 text-[15px] leading-relaxed max-w-md mx-auto">
            {welcome
              ? "You're on the free plan. 2 new projects per week, full AI loop included. Upgrade anytime."
              : "Every plan includes the full board-to-blueprint-to-code loop. No feature gating on the core workflow."}
          </p>
        </div>
      </section>

      {/* Plans */}
      <div className="max-w-5xl mx-auto w-full px-6 pb-20 -mt-12 relative z-10">
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl border p-7 flex flex-col"
              style={{
                borderColor: plan.highlight ? "transparent" : "var(--hairline)",
                background: plan.highlight ? "#2563eb" : "white",
                color: plan.highlight ? "white" : "var(--ink)",
                boxShadow: plan.highlight
                  ? "0 20px 60px rgba(37,99,235,0.35)"
                  : "0 8px 24px rgba(0,0,0,0.05)",
              }}
            >
              <div className="mb-6">
                <div
                  className="text-[11px] font-mono uppercase tracking-widest mb-3"
                  style={{ color: plan.highlight ? "rgba(255,255,255,0.5)" : "var(--ink-muted)" }}
                >
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="serif text-4xl">{plan.price}</span>
                  {plan.period && (
                    <span className="text-[13px]" style={{ color: plan.highlight ? "rgba(255,255,255,0.5)" : "var(--ink-muted)" }}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: plan.highlight ? "rgba(255,255,255,0.65)" : "var(--ink-muted)" }}
                >
                  {plan.description}
                </p>
              </div>

              <ul className="flex-1 space-y-2.5 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px]">
                    <span style={{ color: plan.highlight ? "#ffffff" : "#2563eb" }}>
                      <Icon name="check" size={13} strokeWidth={2.4} />
                    </span>
                    <span style={{ color: plan.highlight ? "rgba(255,255,255,0.85)" : "var(--ink)" }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCta(plan.href)}
                className="w-full text-[13px] font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{
                  background: plan.highlight ? "white" : "#2563eb",
                  color: plan.highlight ? "#2563eb" : "white",
                }}
              >
                {plan.cta}
                <Icon name="arrow-right" size={12} strokeWidth={2.2} />
              </button>
            </div>
          ))}
        </div>

        {/* Compare note */}
        <p className="text-center text-[12px] mt-6" style={{ color: "var(--ink-muted)" }}>
          All prices in USD. Annual billing available (2 months free).
        </p>

        {/* Feature comparison */}
        <div className="mt-20">
          <h2 className="serif text-3xl text-center mb-10">What's included</h2>
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--hairline)" }}>
            {/* Column headers */}
            <div
              className="grid items-center"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--hairline)", background: "white" }}
            >
              <div className="px-5 py-3.5" />
              {["Hobby", "Pro", "Team"].map((plan) => (
                <div
                  key={plan}
                  className="px-5 py-3.5 text-center text-[11px] font-mono uppercase tracking-widest"
                  style={{
                    color: plan === "Pro" ? "#2563eb" : "var(--ink-muted)",
                    fontWeight: plan === "Pro" ? 600 : 400,
                  }}
                >
                  {plan}
                </div>
              ))}
            </div>
            {[
              ["Board — whiteboard with all card types", true, true, true],
              ["Blueprint generation (AI)", true, true, true],
              ["Gap detection (AI)", true, true, true],
              ["AI build chat", true, true, true],
              ["Code generation", "5 gaps/mo", "Unlimited", "Unlimited"],
              ["Active builds", "3", "Unlimited", "Unlimited"],
              ["GitHub push", false, true, true],
              ["Blueprint history", false, false, true],
              ["Team workspace", false, false, true],
              ["SSO / SAML", false, false, true],
            ].map(([feature, hobby, pro, team], i) => (
              <div
                key={i}
                className="grid items-center"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  borderBottom: i < 9 ? "1px solid var(--hairline)" : undefined,
                  background: i % 2 === 0 ? "white" : "var(--paper)",
                }}
              >
                <div className="px-5 py-3.5 text-[13px]" style={{ color: "var(--ink)" }}>
                  {feature}
                </div>
                {[hobby, pro, team].map((val, j) => (
                  <div key={j} className="px-5 py-3.5 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    {val === true ? (
                      <span style={{ color: "#2563eb" }}>
                        <Icon name="check" size={14} strokeWidth={2.2} />
                      </span>
                    ) : val === false ? (
                      <span className="opacity-30">—</span>
                    ) : (
                      <span>{val}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="serif text-3xl text-center mb-10">Common questions</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border p-6" style={{ borderColor: "var(--hairline)", background: "white" }}>
                <h3 className="text-[14px] font-semibold mb-2">{faq.q}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <div className="sky-hero relative rounded-3xl overflow-hidden px-8 py-14">
            <div className="relative z-10">
              <h2 className="serif text-white text-4xl md:text-5xl mb-4">
                Whiteboard in.
                <br />
                <span className="text-white/65">Working app out.</span>
              </h2>
              <p className="text-white/75 text-[14px] mb-8">
                Start for free — no credit card required.
              </p>
              <Link
                href="/auth?mode=signup"
                className="inline-flex items-center gap-2 bg-white text-black text-[14px] font-semibold rounded-full px-7 py-3 hover:bg-neutral-100"
              >
                Start building free
                <Icon name="arrow-right" size={13} strokeWidth={2.2} />
              </Link>
            </div>
          </div>
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
