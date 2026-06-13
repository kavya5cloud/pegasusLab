import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// Providers are added only when their credentials are present, so the app
// boots cleanly before you've wired OAuth. Auth.js auto-reads the
// AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET and AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
// env vars when the provider is constructed with no arguments.
const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub);
}

/** True when a signing secret and at least one OAuth provider are configured. */
export function isAuthConfigured(): boolean {
  return !!process.env.AUTH_SECRET && providers.length > 0;
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
