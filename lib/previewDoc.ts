// Builds a self-contained HTML document that compiles and runs the generated
// project entirely in the browser: Babel transpiles each file, blob URLs act as
// the module graph, and an import map points npm packages at esm.sh.

const REACT = "18.3.1";

// The preview lives in a sandboxed srcdoc iframe (location is about:srcdoc), so
// BrowserRouter (pushState) and HashRouter (URL parsing) both break. Re-export
// react-router-dom with both swapped for MemoryRouter so multi-page apps
// navigate in the preview. The exported Vite project keeps real routing.
const RR = "https://esm.sh/react-router-dom@6.28.0?external=react,react-dom";
const RR_SHIM =
  "data:text/javascript," +
  encodeURIComponent(
    `export * from "${RR}"; export { MemoryRouter as BrowserRouter, MemoryRouter as HashRouter } from "${RR}";`
  );

const IMPORT_MAP = {
  imports: {
    react: `https://esm.sh/react@${REACT}`,
    "react/": `https://esm.sh/react@${REACT}/`,
    "react-dom": `https://esm.sh/react-dom@${REACT}?external=react`,
    "react-dom/": `https://esm.sh/react-dom@${REACT}/`,
    "lucide-react": `https://esm.sh/lucide-react@0.468.0?external=react`,
    "react-router-dom": RR_SHIM,
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
      window.__lvFile = path;
      code = Babel.transform(files[path], {
        presets: [["react", { runtime: "automatic" }]],
        plugins: [window.__lvPlugin],
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

// Visual editor running inside the preview iframe. Every host JSX element gets a
// data-lv="<file>#<n>" id (n = index among host elements in source order). In edit
// mode, clicks select elements, double-click edits text, and the parent toolbar can
// change classes. Edits are applied to the *source* via Babel AST positions, then
// the new source is posted to the parent (source-update), so changes are real code.
const EDITOR = String.raw`
(function () {
  var B = window.Babel && Babel.packages;
  var ok = !!(B && B.parser && B.traverse);
  if (!ok) { window.__lvPlugin = function () { return { visitor: {} }; }; return; }
  var traverse = B.traverse.default || B.traverse;
  var files = window.__FILES__;
  var mode = false, sel = null, editing = null, cancelled = false, editOld = "", hoverEl = null;

  function send(m) { parent.postMessage(m, "*"); }
  function isHost(el) { var n = el.openingElement.name; return n.type === "JSXIdentifier" && /^[a-z]/.test(n.name); }
  function hostElements(ast) {
    var out = [];
    traverse(ast, {
      JSXElement: function (p) {
        if (isHost(p.node)) { p.node.__parentType = p.parent.type; out.push(p.node); }
      }
    });
    return out;
  }

  window.__lvPlugin = function (api) {
    var idx = new WeakMap();
    return {
      visitor: {
        Program: function (path) {
          var i = 0;
          path.traverse({ JSXElement: function (p) { if (isHost(p.node)) idx.set(p.node.openingElement, i++); } });
        },
        JSXOpeningElement: function (path) {
          var i = idx.get(path.node);
          if (i === undefined) return;
          var t = api.types;
          path.node.attributes.push(t.jsxAttribute(t.jsxIdentifier("data-lv"), t.stringLiteral(window.__lvFile + "#" + i)));
        }
      }
    };
  };

  var COLOR = "(\\[(#[0-9a-fA-F]{3,8}|rgba?\\([^\\]]*\\)|hsla?\\([^\\]]*\\))\\]|white|black|transparent|current|inherit|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3})(\\/\\d+)?";
  var CATS = {
    textColor: new RegExp("^text-" + COLOR + "$"),
    bg: new RegExp("^bg-" + COLOR + "$"),
    fontSize: /^text-(xs|sm|base|lg|xl|[2-9]xl)$/,
    fontWeight: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
    radius: /^rounded(-(none|sm|md|lg|xl|2xl|3xl|full))?$/,
    // p / px / py / pt ... all removed so the new padding actually wins in Tailwind's CSS order
    padding: /^p[xytrbl]?-(\d+(\.\d+)?|px|\[[^\]]+\])$/,
    margin: /^-?m[xytrbl]?-(\d+(\.\d+)?|px|auto|\[[^\]]+\])$/,
    textAlign: /^text-(left|center|right|justify)$/
  };
  function tokenFor(op, v) {
    if (!v) return "";
    if (op === "padding") return "p-" + v;
    if (op === "margin") return "m-" + v;
    if (op === "textAlign") return "text-" + v;
    if (op === "textColor") return "text-[" + v + "]";
    if (op === "bg") return "bg-[" + v + "]";
    if (op === "fontSize") return "text-" + v;
    if (op === "fontWeight") return "font-" + v;
    if (op === "radius") return "rounded-" + v;
    return "";
  }

  function withNode(id, fn) {
    try {
      var parts = id.split("#");
      var path = parts[0], n = parseInt(parts[1], 10);
      var src = files[path];
      var ast = B.parser.parse(src, { sourceType: "module", plugins: ["jsx"] });
      var el = hostElements(ast)[n];
      if (!el) return null;
      return fn(el, src, path);
    } catch (e) { return null; }
  }
  function splice(path, src, start, end, text, reload) {
    var out = src.slice(0, start) + text + src.slice(end);
    files[path] = out;
    send({ type: "source-update", path: path, source: out, reload: !!reload });
  }
  function attrOf(el, name) {
    var a = el.openingElement.attributes.filter(function (x) { return x.type === "JSXAttribute" && x.name && x.name.name === name; });
    return a[0] || null;
  }
  function classAttr(el) {
    var a = el.openingElement.attributes.filter(function (x) { return x.type === "JSXAttribute" && x.name && x.name.name === "className"; });
    return a[0] || null;
  }
  function textNodeOf(el) {
    var kids = el.children;
    if (!kids.length || !kids.every(function (k) { return k.type === "JSXText"; })) return null;
    var real = kids.filter(function (k) { return k.value.trim(); });
    return real.length === 1 ? real[0] : null;
  }
  function inspectId(id) {
    return withNode(id, function (el) {
      var a = classAttr(el);
      var s = attrOf(el, "src");
      return {
        canText: !!textNodeOf(el),
        canClass: !a || (a.value && a.value.type === "StringLiteral"),
        isImg: el.openingElement.name.name === "img",
        canSrc: !s || (s.value && s.value.type === "StringLiteral"),
        canDelete: el.__parentType === "JSXElement" || el.__parentType === "JSXFragment"
      };
    });
  }

  function setSrc(src) {
    if (!sel) return;
    var ok = withNode(sel.getAttribute("data-lv"), function (el, source, path) {
      var s = attrOf(el, "src");
      if (s && !(s.value && s.value.type === "StringLiteral")) return false;
      var safe = String(src).replace(/"/g, "%22");
      if (s) splice(path, source, s.value.start + 1, s.value.end - 1, safe);
      else splice(path, source, el.openingElement.name.end, el.openingElement.name.end, ' src="' + safe + '"');
      return true;
    });
    if (!ok) { send({ type: "edit-error", message: "This image source comes from code, so it can't be changed here. Ask the AI instead." }); return; }
    sel.src = src;
    select(sel);
  }

  function deleteSel() {
    if (!sel) return;
    var ok = withNode(sel.getAttribute("data-lv"), function (el, source, path) {
      if (el.__parentType !== "JSXElement" && el.__parentType !== "JSXFragment") return false;
      // Later elements' ids shift, so ask the parent to reload the preview after this edit.
      splice(path, source, el.start, el.end, "", true);
      return true;
    });
    if (!ok) { send({ type: "edit-error", message: "This element can't be deleted here (it's the root or generated by code). Ask the AI instead." }); return; }
    sel.style.display = "none";
    sel = null; hoverEl = null; redraw();
    send({ type: "select", id: null });
  }

  function setText(id, text) {
    var done = withNode(id, function (el, src, path) {
      var tn = textNodeOf(el);
      if (!tn) return false;
      var raw = src.slice(tn.start, tn.end);
      var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      var body = /[{}<>]/.test(text) ? "{" + JSON.stringify(text) + "}" : text.replace(/&/g, "&amp;");
      splice(path, src, tn.start, tn.end, lead + body + trail);
      return true;
    });
    if (!done) send({ type: "edit-error", message: "This text comes from code, so it can't be edited here. Ask the AI instead." });
    return !!done;
  }

  function applyStyle(op, val) {
    if (!sel) return;
    var next = withNode(sel.getAttribute("data-lv"), function (el, src, path) {
      var a = classAttr(el);
      if (a && !(a.value && a.value.type === "StringLiteral")) return null;
      var cur = a ? a.value.value : "";
      var re = CATS[op];
      var toks = cur.split(/\s+/).filter(function (t) { return t && !re.test(t); });
      var nt = tokenFor(op, val);
      if (nt) toks.push(nt);
      var joined = toks.join(" ");
      if (a) splice(path, src, a.value.start + 1, a.value.end - 1, joined);
      else splice(path, src, el.openingElement.name.end, el.openingElement.name.end, ' className="' + joined + '"');
      return joined;
    });
    if (next === null) { send({ type: "edit-error", message: "This element's classes are dynamic, so styles can't be edited here. Ask the AI instead." }); return; }
    sel.className = next;
    select(sel);
  }

  function hex(c) {
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return "";
    var p = m[1].split(",").map(function (x) { return parseFloat(x); });
    if (p.length > 3 && p[3] === 0) return "";
    return "#" + [p[0], p[1], p[2]].map(function (n) { return ("0" + Math.round(n).toString(16)).slice(-2); }).join("");
  }

  function mkOverlay(color) {
    var d = document.createElement("div");
    d.style.cssText = "position:fixed;pointer-events:none;z-index:2147483646;display:none;box-sizing:border-box;border:2px solid " + color;
    document.documentElement.appendChild(d);
    return d;
  }
  var hoverOv = mkOverlay("rgba(139,92,246,.55)"), selOv = mkOverlay("#8b5cf6");
  function place(ov, el) {
    if (!el || !document.documentElement.contains(el)) { ov.style.display = "none"; return; }
    var r = el.getBoundingClientRect();
    ov.style.display = "block";
    ov.style.left = r.left + "px"; ov.style.top = r.top + "px";
    ov.style.width = r.width + "px"; ov.style.height = r.height + "px";
  }
  function redraw() {
    place(hoverOv, mode && !editing && hoverEl !== sel ? hoverEl : null);
    place(selOv, mode ? sel : null);
  }
  window.addEventListener("scroll", redraw, true);
  window.addEventListener("resize", redraw);

  function tgt(t) { return t && t.closest ? t.closest("[data-lv]") : null; }

  function select(el) {
    sel = el;
    redraw();
    if (!el) { send({ type: "select", id: null }); return; }
    var id = el.getAttribute("data-lv");
    var info = inspectId(id) || { canText: false, canClass: false };
    var cs = getComputedStyle(el);
    send({
      type: "select", id: id, tag: el.tagName.toLowerCase(),
      text: info.canText ? el.textContent.trim() : null,
      canText: info.canText, canClass: info.canClass,
      isImg: !!info.isImg, canSrc: !!info.canSrc, canDelete: !!info.canDelete,
      src: info.isImg ? (el.getAttribute("src") || "").slice(0, 300) : null,
      align: cs.textAlign,
      color: hex(cs.color), bg: hex(cs.backgroundColor),
      fontSize: Math.round(parseFloat(cs.fontSize)), bold: parseInt(cs.fontWeight, 10) >= 600
    });
  }

  function onKey(e) {
    if (e.key === "Enter") { e.preventDefault(); editing && editing.blur(); }
    else if (e.key === "Escape") { cancelled = true; if (editing) { editing.textContent = editOld; editing.blur(); } }
  }
  function startEdit(el) {
    var info = inspectId(el.getAttribute("data-lv"));
    if (!info || !info.canText) {
      send({ type: "edit-error", message: "This text comes from code, so it can't be edited here. Ask the AI instead." });
      return;
    }
    editing = el; cancelled = false; editOld = el.textContent;
    el.contentEditable = "true";
    el.style.outline = "none";
    el.focus();
    var r = document.createRange(); r.selectNodeContents(el);
    var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    el.addEventListener("keydown", onKey);
    el.addEventListener("blur", finishEdit);
    redraw();
  }
  function finishEdit() {
    var el = editing;
    if (!el) return;
    editing = null;
    el.removeEventListener("keydown", onKey);
    el.removeEventListener("blur", finishEdit);
    el.removeAttribute("contenteditable");
    el.style.outline = "";
    if (!cancelled) {
      var t = el.innerText.replace(/\s*\n\s*/g, " ").trim();
      if (!t) el.textContent = editOld;
      else if (t !== editOld.trim()) {
        if (!setText(el.getAttribute("data-lv"), t)) el.textContent = editOld;
      }
    }
    select(el);
  }

  document.addEventListener("mouseover", function (e) { if (!mode || editing) return; hoverEl = tgt(e.target); redraw(); }, true);
  document.addEventListener("click", function (e) {
    if (!mode) return;
    if (editing && editing.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    if (editing) finishEdit();
    select(tgt(e.target));
  }, true);
  document.addEventListener("dblclick", function (e) {
    if (!mode) return;
    e.preventDefault(); e.stopPropagation();
    var el = tgt(e.target);
    if (el) { select(el); startEdit(el); }
  }, true);
  document.addEventListener("submit", function (e) { if (mode) e.preventDefault(); }, true);

  window.addEventListener("message", function (e) {
    if (e.source !== parent) return;
    var m = e.data || {};
    if (m.type === "mode") {
      mode = !!m.on;
      if (!mode) { if (editing) finishEdit(); sel = null; hoverEl = null; send({ type: "select", id: null }); }
      redraw();
    } else if (m.type === "setText" && sel) {
      if (setText(sel.getAttribute("data-lv"), String(m.text))) { sel.textContent = String(m.text); select(sel); }
    } else if (m.type === "style" && sel) {
      applyStyle(m.op, m.value);
    } else if (m.type === "setSrc" && sel) {
      setSrc(m.src);
    } else if (m.type === "delete" && sel) {
      deleteSel();
    }
  });
})();
`;

// The preview iframe is sandboxed without allow-same-origin, so the real
// localStorage/sessionStorage throw. Provide in-memory stand-ins so generated
// apps that persist data keep working. localStorage is seeded from, and synced
// back to, the parent page (per project) so data survives reloads; sessionStorage
// is in-memory only.
const STORAGE_SHIM = `
(function () {
  function make(seed, onChange) {
    var d = {};
    Object.keys(seed || {}).forEach(function (k) { d[k] = String(seed[k]); });
    function changed() { if (onChange) onChange(d); }
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
      setItem: function (k, v) { d[k] = String(v); changed(); },
      removeItem: function (k) { delete d[k]; changed(); },
      clear: function () { d = {}; changed(); },
      key: function (i) { return Object.keys(d)[i] || null; },
      get length() { return Object.keys(d).length; }
    };
  }
  var seed = window.__STORAGE__ || {};
  var impls = {
    localStorage: function () {
      return make(seed, function (d) { parent.postMessage({ type: "storage-sync", data: d }, "*"); });
    },
    sessionStorage: function () { return make({}, null); }
  };
  ["localStorage", "sessionStorage"].forEach(function (name) {
    try { window[name].getItem("x"); }
    catch (e) { Object.defineProperty(window, name, { value: impls[name](), configurable: true }); }
  });
})();
`;

export function buildPreviewDoc(
  files: Record<string, string>,
  storage: Record<string, string> = {}
): string {
  const safe = (s: string) => s.replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script>window.__STORAGE__ = ${safe(JSON.stringify(storage))};</script>
<script>${STORAGE_SHIM}</script>
<style>html,body{margin:0;background:#fff;color:#111;min-height:100%}</style>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js"></script>
<script type="importmap">${safe(JSON.stringify(IMPORT_MAP))}</script>
</head>
<body>
<div id="root"></div>
<script>window.__FILES__ = ${safe(JSON.stringify(files))};</script>
<script>${EDITOR}</script>
<script>${RUNNER}</script>
</body>
</html>`;
}
