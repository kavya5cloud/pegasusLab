import type { CSSProperties, ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  // pegasus lab. splat mark — six stubby round-capped arms of uneven
  // length around a heavy core; the right arm reaches longest.
  logo: (
    <g strokeWidth={4.9} strokeLinecap="round">
      <path d="M12 12l1.6-6.4" />
      <path d="M12 12 6.6 6.8" />
      <path d="M12 12l-7 .6" />
      <path d="M12 12l-4.6 5.6" />
      <path d="M12 12l3.2 6.2" />
      <path d="M12 12l7.6-.8" />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />
    </g>
  ),
  idea: (
    <>
      <path d="M9.5 18h5" />
      <path d="M10.5 21h3" />
      <path d="M12 3a6 6 0 0 1 4 10.4c-.7.6-1 1.4-1 2.1h-6c0-.7-.3-1.5-1-2.1A6 6 0 0 1 12 3z" />
    </>
  ),
  code: (
    <>
      <path d="M8 6 3 12l5 6" />
      <path d="m16 6 5 6-5 6" />
    </>
  ),
  github: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="8" r="2.2" />
      <path d="M6 8.2v7.6" />
      <path d="M18 10.2c0 4.3-6.5 3.1-9.5 5.3" />
    </>
  ),
  figma: (
    <>
      <circle cx="12" cy="7.5" r="3.8" />
      <circle cx="12" cy="16.5" r="3.8" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10.5" r="1.4" />
      <path d="m3 17 5-4 4 3 4-4 5 5" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M10 12h6M10 16h6" />
    </>
  ),
  api: (
    <>
      <path d="M4 8h12" />
      <path d="m13 4 4 4-4 4" />
      <path d="M20 16H8" />
      <path d="m11 12-4 4 4 4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </>
  ),
  service: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" />
    </>
  ),
  page: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </>
  ),
  component: <path d="m12 3 9 9-9 9-9-9z" />,
  external: (
    <path d="M7 18a4.5 4.5 0 1 1 .9-8.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z" />
  ),
  design: (
    <>
      <path d="m12 19 7-7-4-4-7 7-1 5z" />
      <path d="m15 8 2-2 4 4-2 2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  blueprint: (
    <>
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="m7 11 10-4M7 13l10 4" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 19v3" />
      <path d="M9 22h6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  bolt: <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z" />,
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 3c3 1.5 5 4.6 5 8.5 0 1.7-.4 3.3-1 4.5H8c-.6-1.2-1-2.8-1-4.5C7 7.6 9 4.5 12 3z" />
      <circle cx="12" cy="10" r="1.6" />
      <path d="M9 17c-1.4.8-2 2.4-2 4 1.6 0 3.2-.6 4-2M15 17c1.4.8 2 2.4 2 4-1.6 0-3.2-.6-4-2" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m21 21-4.5-4.5" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  "sort": (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
  "layout-list": (
    <>
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <path d="M13 6h8M13 10h5M3 19h18M3 15h18" />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

/** Full-color Google "G" mark for the OAuth button (not stroke-based). */
export function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.21-2.36H12v4.46h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.72z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.26a12 12 0 0 0 0 10.74l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export function Icon({
  name,
  size = 14,
  strokeWidth = 1.6,
  className,
  style,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {ICONS[name] ?? null}
    </svg>
  );
}
