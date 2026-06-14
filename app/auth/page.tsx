"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn as oauthSignIn } from "next-auth/react";
import { Icon } from "@/components/icons";
import { GoogleMark } from "@/components/icons";
import { getUser, signIn } from "@/lib/auth";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [next, setNext] = useState("/projects");
  const [providers, setProviders] = useState<{ google: boolean; github: boolean }>({
    google: false,
    github: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    const n = params.get("next");
    if (n) setNext(n);
    if (getUser()) router.replace(n || "/projects");
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => d.auth && setProviders(d.auth))
      .catch(() => {});
  }, [router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    const resolvedName = name.trim() || email.split("@")[0];
    signIn({ name: resolvedName, email: email.trim() });
    if (mode === "signup") {
      // Fire-and-forget welcome email — don't block navigation on it.
      fetch("/api/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: resolvedName, email: email.trim() }),
      }).catch(() => {});
      router.push("/settings?setup=1");
    } else {
      router.push(next);
    }
  }

  // Real OAuth when the provider is configured; otherwise a graceful demo
  // sign-in so the product stays usable before credentials are added.
  function oauth(provider: "google" | "github") {
    if (providers[provider]) {
      oauthSignIn(provider, { callbackUrl: next });
      return;
    }
    signIn({
      name: name.trim() || (provider === "google" ? "Google developer" : "GitHub developer"),
      email: email.trim() || `dev@${provider}.demo`,
    });
    router.push(next);
  }

  return (
    <main className="flex-1 min-h-screen flex flex-col" style={{ background: "var(--paper)" }}>
      <section className="sky-hero relative mx-3 my-3 rounded-3xl overflow-hidden flex-1 flex flex-col">
        {/* Nav — same language as the landing */}
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
            <Link href="/" className="hover:text-white">Platform</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/#how" className="hover:text-white">Docs</Link>
          </div>
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-[13px] font-medium bg-white text-black rounded-full px-4 py-1.5 hover:bg-white/90"
          >
            {mode === "signin" ? "Get started" : "Sign in"}
          </button>
        </nav>

        {/* Centered card */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <h1 className="serif text-white text-4xl md:text-5xl text-center leading-[1.08]">
            {mode === "signin" ? "Welcome back to" : "Welcome to"}
            <br />
            <span className="text-white/70">the future of software.</span>
          </h1>
          <p className="text-white/85 text-[13px] text-center mt-4 mb-8 max-w-sm">
            {mode === "signin"
              ? "Sign in to open your whiteboards and blueprints."
              : "Free forever with your own Gemini API key — no credit card, no subscription."}
          </p>

          <form
            onSubmit={submit}
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 space-y-3"
          >
            <button
              type="button"
              onClick={() => oauth("google")}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-medium border hover:bg-neutral-50 transition-colors"
              style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
            >
              <GoogleMark size={16} />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => oauth("github")}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-medium text-white bg-[#141414] hover:bg-[#262626] transition-colors"
            >
              <Icon name="github" size={15} strokeWidth={1.9} />
              Continue with GitHub
            </button>
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
              <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                or with email
              </span>
              <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
            </div>
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-blue-500 transition-colors text-neutral-900"
                style={{ borderColor: "var(--hairline)" }}
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="Email address"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-blue-500 transition-colors text-neutral-900"
              style={{ borderColor: "var(--hairline)" }}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-blue-500 transition-colors text-neutral-900"
              style={{ borderColor: "var(--hairline)" }}
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl py-3 flex items-center justify-center gap-2"
            >
              {mode === "signin" ? "Sign in" : "Create account"}
              <Icon name="arrow-right" size={13} strokeWidth={2.2} />
            </button>
            <div className="flex items-center justify-between pt-1">
              <Image
                src="/pegasuslogo.png"
                alt="pegasus lab."
                width={72}
                height={60}
                className="-my-3 -ml-2"
              />
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-[12px] text-neutral-500 underline hover:text-black"
              >
                {mode === "signin" ? "Create an account" : "Sign in instead"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
