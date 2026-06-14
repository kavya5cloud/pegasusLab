"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ? stored === "dark" : prefersDark;
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return { dark, toggle };
}

export default function ThemeToggle({
  variant = "icon",
  color,
}: {
  variant?: "icon" | "pill";
  color?: string;
}) {
  const { dark, toggle } = useTheme();

  if (variant === "pill") {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[12px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        style={{ color: color ?? "var(--ink-muted)" }}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Icon name={dark ? "bolt" : "service"} size={13} strokeWidth={1.8} />
        {dark ? "Light mode" : "Dark mode"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:bg-white/10"
      style={{ color: color ?? "var(--ink-muted)" }}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        /* sun */
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        /* moon */
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
