import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // WebContainers (live preview) need cross-origin isolation for
    // SharedArrayBuffer. Scope it to the workspace route only so OAuth,
    // OG images, and the marketing pages are unaffected. `credentialless`
    // still lets cross-origin subresources (e.g. Google avatars) load.
    return [
      {
        source: "/project/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
