const IMPORT = /(?:from\s*|import\s*)(["'])(\.{1,2}\/[^"']+)\1/g;

const EXTS = ["", ".js", ".jsx", "/index.js", "/index.jsx"];

function resolveSpec(from: string, spec: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const seg of spec.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return "/" + parts.filter(Boolean).join("/");
}

/**
 * While the AI is still writing, /App.js may import components that have not been written yet.
 * Adds an empty placeholder for each missing local file so the finished sections can already render.
 */
export function withStubs(files: Record<string, string>): Record<string, string> {
  const out = { ...files };
  for (const [path, code] of Object.entries(files)) {
    if (!/\.jsx?$/.test(path)) continue;
    for (const m of code.matchAll(IMPORT)) {
      const target = resolveSpec(path, m[2]);
      if (EXTS.some((e) => target + e in out)) continue;
      if (/\.(css|json)$/.test(target)) continue;
      out[target.endsWith(".js") || target.endsWith(".jsx") ? target : target + ".js"] =
        "export default function Pending(){return null}";
    }
  }
  return out;
}
