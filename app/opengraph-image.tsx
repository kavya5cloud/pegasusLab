import { ImageResponse } from "next/og";

export const alt = "pegasus lab. — whiteboard in, working app out";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social card — sky-blue gradient matching the marketing theme.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #5b86d6 0%, #8fb0e8 42%, #cdddf5 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#ffffff",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth={4.9} strokeLinecap="round">
              <path d="M12 12l1.6-6.4" />
              <path d="M12 12 6.6 6.8" />
              <path d="M12 12l-7 .6" />
              <path d="M12 12l-4.6 5.6" />
              <path d="M12 12l3.2 6.2" />
              <path d="M12 12l7.6-.8" />
              <circle cx="12" cy="12" r="3.4" fill="#141414" stroke="none" />
            </svg>
          </div>
          <div style={{ color: "#ffffff", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            pegasus lab.
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              fontSize: 22,
              padding: "8px 18px",
              borderRadius: 999,
              marginBottom: 28,
            }}
          >
            The intelligence layer between ideas and software
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              color: "#ffffff",
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -2,
            }}
          >
            <span>Whiteboard in.</span>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Working app out.</span>
          </div>
        </div>

        {/* Footer line */}
        <div style={{ display: "flex", color: "rgba(255,255,255,0.85)", fontSize: 26 }}>
          Drop ideas, code, repos &amp; designs → living blueprint → shipped code
        </div>
      </div>
    ),
    { ...size }
  );
}
