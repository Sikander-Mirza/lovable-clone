// Builds a self-contained HTML document that compiles and runs the generated
// project entirely in the browser: Babel transpiles each file, blob URLs act as
// the module graph, and an import map points npm packages at esm.sh.

const REACT = "18.3.1";

const IMPORT_MAP = {
  imports: {
    react: `https://esm.sh/react@${REACT}`,
    "react/": `https://esm.sh/react@${REACT}/`,
    "react-dom": `https://esm.sh/react-dom@${REACT}?external=react`,
    "react-dom/": `https://esm.sh/react-dom@${REACT}/`,
    "lucide-react": `https://esm.sh/lucide-react@0.468.0?external=react`,
    "react-router-dom": `https://esm.sh/react-router-dom@6.28.0?external=react,react-dom`,
    "framer-motion": `https://esm.sh/framer-motion@11.15.0?external=react,react-dom`,
    recharts: `https://esm.sh/recharts@2.15.0?external=react,react-dom`,
    "date-fns": `https://esm.sh/date-fns@4.1.0`,
  },
};

const RUNNER = `
const files = window.__FILES__;
const blobs = {};
const busy = {};

function showError(msg) {
  let el = document.getElementById("__err");
  if (!el) {
    el = document.createElement("pre");
    el.id = "__err";
    el.style.cssText = "position:fixed;inset:0;margin:0;padding:16px;background:#1a0b0b;color:#ff8a8a;font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap;overflow:auto;z-index:99999";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  parent.postMessage({ type: "preview-error", message: String(msg) }, "*");
}

function resolve(from, spec) {
  const parts = from.split("/").slice(0, -1);
  for (const seg of spec.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") parts.pop(); else parts.push(seg);
  }
  const base = parts.join("/") || "/";
  const path = base.startsWith("/") ? base : "/" + base;
  for (const c of [path, path + ".js", path + ".jsx", path + "/index.js", path + "/index.jsx"]) {
    if (c in files) return c;
  }
  throw new Error("Cannot find module '" + spec + "' imported from " + from);
}

function build(path) {
  if (blobs[path]) return blobs[path];
  if (busy[path]) throw new Error("Circular import involving " + path);
  busy[path] = true;
  let code;
  if (path.endsWith(".css")) {
    code = "const s=document.createElement('style');s.textContent=" + JSON.stringify(files[path]) + ";document.head.appendChild(s);export default {};";
  } else {
    try {
      code = Babel.transform(files[path], {
        presets: [["react", { runtime: "automatic" }]],
        filename: path,
      }).code;
    } catch (e) {
      throw new Error(path + ": " + e.message);
    }
    code = code.replace(/(\\bfrom\\s*|\\bimport\\s*)(["'])(\\.{1,2}\\/[^"']+)\\2/g, (m, pre, q, spec) =>
      pre + q + build(resolve(path, spec)) + q
    );
  }
  busy[path] = false;
  return (blobs[path] = URL.createObjectURL(new Blob([code], { type: "text/javascript" })));
}

window.addEventListener("error", (e) => showError(e.message));
window.addEventListener("unhandledrejection", (e) => showError(e.reason && e.reason.message || e.reason));

(async () => {
  try {
    const entry = "/App.js" in files ? "/App.js" : Object.keys(files).find((f) => /\\.jsx?$/.test(f));
    if (!entry) return;
    const appUrl = build(entry);
    const main =
      "import React from 'react';import {createRoot} from 'react-dom/client';import App from " +
      JSON.stringify(appUrl) +
      ";class EB extends React.Component{constructor(p){super(p);this.state={e:null}}static getDerivedStateFromError(e){return{e}}render(){if(this.state.e){window.dispatchEvent(new ErrorEvent('error',{message:String(this.state.e&&this.state.e.stack||this.state.e)}));return null}return this.props.children}}" +
      "createRoot(document.getElementById('root')).render(React.createElement(EB,null,React.createElement(App)));";
    await import(URL.createObjectURL(new Blob([main], { type: "text/javascript" })));
    parent.postMessage({ type: "preview-ready" }, "*");
  } catch (e) {
    showError(e && e.message || e);
  }
})();
`;

export function buildPreviewDoc(files: Record<string, string>): string {
  const safe = (s: string) => s.replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>html,body{margin:0;background:#fff;color:#111;min-height:100%}</style>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js"></script>
<script type="importmap">${safe(JSON.stringify(IMPORT_MAP))}</script>
</head>
<body>
<div id="root"></div>
<script>window.__FILES__ = ${safe(JSON.stringify(files))};</script>
<script>${RUNNER}</script>
</body>
</html>`;
}
