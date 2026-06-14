import type { FileSystemTree } from "@webcontainer/api";

// A fixed, minimal Vite + React scaffold. Only src/App.jsx is AI-generated;
// everything else is pinned and controlled here so the dev server always boots.

const PACKAGE_JSON = JSON.stringify(
  {
    name: "pegasus-preview",
    private: true,
    type: "module",
    scripts: { dev: "vite --port 5173 --host" },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.4",
      vite: "^5.4.11",
    },
  },
  null,
  2
);

const VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
});
`;

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pegasus Preview</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const MAIN_JSX = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

/** Assemble the WebContainer file tree, injecting the generated App.jsx. */
export function previewFiles(appCode: string): FileSystemTree {
  return {
    "package.json": { file: { contents: PACKAGE_JSON } },
    "vite.config.js": { file: { contents: VITE_CONFIG } },
    "index.html": { file: { contents: INDEX_HTML } },
    src: {
      directory: {
        "main.jsx": { file: { contents: MAIN_JSX } },
        "App.jsx": { file: { contents: appCode } },
      },
    },
  };
}
