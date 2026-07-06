import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { getUserByEmail } from "@/lib/store";
import { verifyPassword } from "@/lib/password";

// Email + password accounts are always available; OAuth providers are added
// only when their credentials are present, so the app boots cleanly before
// you've wired OAuth. Auth.js auto-reads the AUTH_GOOGLE_ID /
// AUTH_GOOGLE_SECRET and AUTH_GITHUB_ID / AUTH_GITHUB_SECRET env vars when
// the provider is constructed with no arguments.
const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(creds) {
      const email = String(creds?.email ?? "").trim().toLowerCase();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;
      let user;
      try {
        user = await getUserByEmail(email);
      } catch (err) {
        // A storage failure (bad DATABASE_URL, Neon outage) must read as a
        // failed sign-in, not an Auth.js "server configuration" error page.
        console.error("[auth] user lookup failed:", err);
        return null;
      }
      if (!user || !verifyPassword(password, user.passwordHash)) return null;
      return { email: user.email, name: user.name };
    },
  }),
];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub);
}

/** Auth is always configured — credentials accounts work out of the box. */
export function isAuthConfigured(): boolean {
  return true;
}

/** Which providers are available, for the sign-in UI. */
export function availableProviders(): { google: boolean; github: boolean } {
  return {
    google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    github: !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  // JWT cookie sessions — no database needed for auth itself.
  session: { strategy: "jwt" },
  pages: { signIn: "/auth" },
  trustHost: true,
  // A real AUTH_SECRET is required in production; fall back to a throwaway
  // value in development so the session endpoint never 500s before it's set.
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV !== "production"
      ? "dev-insecure-pegasus-secret"
      : undefined),
});
