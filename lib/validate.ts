// Static checks for generated projects, run on the server (esbuild + the real lucide-react
// export list) BEFORE the user sees a crash. Used by /api/validate (auto-fix loop) and by
// the eval harness. Catches the failures LLMs make most: syntax slips, imports of packages
// or files that do not exist, and invented lucide icon names.
import { transform } from "esbuild";
import { PHOTOS } from "./photos";
import { THEME_PATH } from "./theme";

export type Issue = { file: string; message: string; severity: "error" | "warn" };

const ALLOWED = new Set([
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "lucide-react",
  "react-router-dom",
  "framer-motion",
  "recharts",
  "date-fns",
  "lovable",
]);

const KNOWN_PHOTO_IDS = new Set(Object.values(PHOTOS).flat());

let lucideNames: Set<string> | null = null;
async function lucide(): Promise<Set<string>> {
  if (!lucideNames) {
    const mod = (await import("lucide-react")) as Record<string, unknown>;
    lucideNames = new Set(Object.keys(mod));
  }
  return lucideNames;
}

function resolves(files: Record<string, string>, from: string, spec: string): boolean {
  const parts = from.split("/").slice(0, -1);
  for (const seg of spec.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  const base = "/" + parts.join("/").replace(/^\/+/, "");
  return [base, base + ".js", base + ".jsx", base + "/index.js", base + "/index.jsx"].some((c) => c in files);
}

// import X, { a, b as c } from "pkg"  |  import "pkg"  |  import * as X from "pkg"
const IMPORT_RE = /import\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}\s*)?(?:\*\s+as\s+[\w$]+\s*)?(?:from\s*)?["']([^"']+)["']/g;

export async function validateProject(files: Record<string, string>): Promise<Issue[]> {
  const issues: Issue[] = [];
  const icons = await lucide();

  if (!("/App.js" in files)) {
    issues.push({ file: "/App.js", severity: "error", message: "Missing /App.js entry file." });
  } else if (!/export\s+default/.test(files["/App.js"])) {
    issues.push({ file: "/App.js", severity: "error", message: "/App.js must `export default` a React component." });
  }

  for (const [path, code] of Object.entries(files)) {
    if (path === THEME_PATH) {
      try {
        const t = JSON.parse(code);
        if (!/^#[0-9a-fA-F]{6}$/.test(t.brand ?? "")) {
          issues.push({ file: path, severity: "warn", message: 'theme.json "brand" must be a 6-digit hex like #4f46e5.' });
        }
      } catch {
        issues.push({ file: path, severity: "error", message: "theme.json is not valid JSON." });
      }
      continue;
    }
    if (!/\.jsx?$/.test(path)) continue;

    try {
      await transform(code, { loader: "jsx", jsx: "automatic", sourcefile: path });
    } catch (e: any) {
      const first = e?.errors?.[0];
      const where = first?.location ? ` (line ${first.location.line}, col ${first.location.column})` : "";
      issues.push({ file: path, severity: "error", message: `Syntax error${where}: ${first?.text ?? e?.message ?? "cannot compile"}` });
      continue; // imports of broken code are noise
    }

    for (const m of code.matchAll(IMPORT_RE)) {
      const [, , named, spec] = m;
      if (spec.startsWith(".")) {
        if (!resolves(files, path, spec) && !/\.(css|json)$/.test(spec)) {
          issues.push({ file: path, severity: "error", message: `Cannot find file "${spec}" (imported here). Create it or fix the path.` });
        }
      } else if (!ALLOWED.has(spec)) {
        issues.push({ file: path, severity: "error", message: `Package "${spec}" is not available. Allowed: react, react-dom, lucide-react, react-router-dom, framer-motion, recharts, date-fns.` });
      } else if (spec === "lucide-react" && named) {
        for (const raw of named.split(",")) {
          const name = raw.trim().split(/\s+as\s+/)[0];
          if (name && !icons.has(name)) {
            issues.push({ file: path, severity: "error", message: `Icon "${name}" does not exist in lucide-react. Use a real icon name.` });
          }
        }
      }
    }

    for (const m of code.matchAll(/images\.unsplash\.com\/photo-([0-9a-f]+-[0-9a-f]+)/g)) {
      if (!KNOWN_PHOTO_IDS.has(m[1])) {
        issues.push({ file: path, severity: "warn", message: `Photo "${m[1]}" is not in the approved library; use only IDs from the catalog.` });
      }
    }
  }
  return issues;
}

/** Human-readable list for sending to the model. */
export function formatIssues(issues: Issue[]): string {
  return issues.map((i) => `- ${i.file}: ${i.message}`).join("\n");
}
