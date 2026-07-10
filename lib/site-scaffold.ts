import type { FileSystemTree } from "@webcontainer/api";
import type { SiteFile } from "./types";

// Fixed scaffold for generated websites. Only src/ files are AI-generated;
// the build setup is ours, so the toolchain can never break.

export const SITE_PACKAGE_JSON = `{
  "name": "pegasus-site",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.11"
  }
}
`;

export const SITE_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
});
`;

/** Google Fonts stylesheet link for the design-DNA font families. */
function fontLinks(fonts: string[]): string {
  const clean = fonts
    .map((f) => f.trim())
    .filter((f) => /^[A-Za-z0-9 ]{2,40}$/.test(f))
    .slice(0, 3);
  if (clean.length === 0) return "";
  const families = clean
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700;800`)
    .join("&");
  return `\n    <link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link href="https://fonts.googleapis.com/css2?${families}&display=swap" rel="stylesheet" />`;
}

export function siteIndexHtml(title: string, fonts: string[] = []): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title.replace(/</g, "&lt;")}</title>${fontLinks(fonts)}
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
}

export const SITE_MAIN_JSX = `import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
`;

// Minimal base styles so the site looks intentional even if the Tailwind CDN
// is slow or blocked; generated files may extend this via src/styles.css.
export const SITE_BASE_CSS = `*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: #111; }
a { color: inherit; }
img { max-width: 100%; display: block; }
`;

export function siteReadme(name: string): string {
  return `# ${name}

Generated with Pegasus Lab (https://pegasuslab.in).

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open http://localhost:5173.

## Build for production

\`\`\`bash
npm run build
\`\`\`
`;
}

/** Files every generated site ships with, independent of the AI output. */
export function siteStaticFiles(projectName: string, fonts: string[] = []): SiteFile[] {
  return [
    { path: "package.json", code: SITE_PACKAGE_JSON },
    { path: "vite.config.js", code: SITE_VITE_CONFIG },
    { path: "index.html", code: siteIndexHtml(projectName, fonts) },
    { path: "src/main.jsx", code: SITE_MAIN_JSX },
    { path: "README.md", code: siteReadme(projectName) },
  ];
}

/** Merge static scaffold + generated files into a WebContainer tree. */
export function siteTree(projectName: string, generated: SiteFile[], fonts: string[] = []): FileSystemTree {
  const all: SiteFile[] = [...siteStaticFiles(projectName, fonts), ...generated];
  // Guarantee styles.css exists since main.jsx imports it.
  if (!all.some((f) => f.path === "src/styles.css")) {
    all.push({ path: "src/styles.css", code: SITE_BASE_CSS });
  }
  const tree: FileSystemTree = {};
  for (const file of all) {
    if (!file?.path || typeof file.code !== "string") continue;
    const parts = file.path.split("/").filter(Boolean);
    let node: FileSystemTree = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      const existing = node[dir];
      if (existing && "directory" in existing) {
        node = existing.directory as FileSystemTree;
      } else {
        const created: FileSystemTree = {};
        node[dir] = { directory: created };
        node = created;
      }
    }
    node[parts[parts.length - 1]] = { file: { contents: file.code } };
  }
  return tree;
}
