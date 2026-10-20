// Wraps the generated files (/App.js, /components/*.js ...) in a runnable
// Vite + React + Tailwind scaffold so the repo works with `npm install && npm run dev`.

import { THEME_PATH, fontsHref, parseTheme, tailwindConfig } from "./theme";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "app";

export function toRepoFiles(files: Record<string, string>, name: string): Record<string, string> {
  const out: Record<string, string> = {};
  const theme = parseTheme(files);

  for (const [path, content] of Object.entries(files)) {
    // The theme becomes tailwind.config.js + index.css below.
    if (path.startsWith("/public/") || path === THEME_PATH) continue;
    out["src" + path] = content;
  }

  out["package.json"] = JSON.stringify(
    {
      name: slug(name),
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "lucide-react": "^0.468.0",
        "react-router-dom": "^6.28.0",
        "framer-motion": "^11.15.0",
        recharts: "^2.15.0",
        "date-fns": "^4.1.0",
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.4",
        autoprefixer: "^10.4.20",
        postcss: "^8.4.49",
        tailwindcss: "^3.4.17",
        vite: "^6.0.0",
      },
    },
    null,
    2
  );

  out["vite.config.js"] = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Generated components use JSX inside .js files.
export default defineConfig({
  plugins: [react({ include: /\\.(js|jsx)$/ })],
  esbuild: { loader: "jsx", include: /src\\/.*\\.jsx?$/, exclude: [] },
  optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } },
});
`;

  out["index.html"] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name.replace(/[<>&"]/g, "")}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="stylesheet" href="${fontsHref(theme)}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;

  out["src/main.js"] = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./index.css";

createRoot(document.getElementById("root")).render(<App />);
`;

  out["src/index.css"] = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body { font-family: '${theme.font}', ui-sans-serif, system-ui, sans-serif; }
  h1, h2, h3, h4, h5, h6 { font-family: '${theme.headingFont}', ui-sans-serif, system-ui, sans-serif; }
}
`;

  const cfg = tailwindConfig(theme);
  out["tailwind.config.js"] = `export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: ${JSON.stringify(cfg.theme, null, 2).replace(/\n/g, "\n  ")},
  plugins: [],
};
`;
  out["postcss.config.js"] = `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
`;
  out[".gitignore"] = "node_modules\ndist\n.env\n";
  out["README.md"] = `# ${name}

Generated with lovable-clone.

\`\`\`bash
npm install
npm run dev
\`\`\`
`;

  return out;
}
