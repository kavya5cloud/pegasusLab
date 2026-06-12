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
