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

/**
 * When the AI writes the components before /App.js, there is no entry file yet. Builds a temporary
 * one that stacks the finished components in the order they were written.
 */
export function withTempApp(files: Record<string, string>): Record<string, string> {
  if ("/App.js" in files) return files;
  const comps = Object.keys(files).filter((p) => /^\/components\/.+\.jsx?$/.test(p));
  if (!comps.length) return files;
  const imports = comps.map((p, i) => `import * as M${i} from ${JSON.stringify("." + p)};`).join("\n");
  const list = comps.map((_, i) => `M${i}.default`).join(",");
  return {
    ...files,
    "/App.js": `${imports}\nconst C=[${list}].filter(Boolean);\nexport default function App(){return <>{C.map((X,i)=><X key={i}/>)}</>}`,
  };
}
