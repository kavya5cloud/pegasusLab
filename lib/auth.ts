"use client";

// Lightweight client-side session for the MVP — no server auth yet.
export interface SessionUser {
  name: string;
  email: string;
}

const KEY = "pegasus_user";

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function signIn(user: SessionUser): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function signOut(): void {
  localStorage.removeItem(KEY);
}

/** Returns headers to forward user-provided API keys to the server. */
export function userApiHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const headers: Record<string, string> = {};
  const ak = localStorage.getItem("pegasus_anthropic_key");
  const gk = localStorage.getItem("pegasus_google_key");
  const ou = localStorage.getItem("pegasus_ollama_url");
  const om = localStorage.getItem("pegasus_ollama_model");
  const gh = localStorage.getItem("pegasus_github_token");
  if (ak) headers["x-anthropic-key"] = ak;
  if (gk) headers["x-google-key"]    = gk;
  if (ou) headers["x-ollama-url"]    = ou;
  if (om) headers["x-ollama-model"]  = om;
  if (gh) headers["x-github-token"]  = gh;
  return headers;
}

/** True when at least one AI key/endpoint is saved in this browser. */
export function hasAnyApiKey(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    localStorage.getItem("pegasus_anthropic_key") ||
    localStorage.getItem("pegasus_google_key") ||
    localStorage.getItem("pegasus_ollama_url")
  );
}
