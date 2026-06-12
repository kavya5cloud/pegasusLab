import type { CSSProperties, ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  // Five-armed splat mark — chunky round-capped arms radiating from a
  // filled core, matching the pegasus lab. wordmark image.
  logo: (
    <g strokeWidth={5.4} strokeLinecap="round">
      <path d="M12 12 13.6 5.4" />
      <path d="M12 12l6.8-.6" />
      <path d="M12 12l3.4 6" />
      <path d="M12 12l-5.6 4.6" />
      <path d="M12 12 5.8 8.2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
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
  plus: <path d="M12 5v14M5 12h14" />,
  bolt: <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z" />,
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

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
