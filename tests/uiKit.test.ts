import { test } from "node:test";
import assert from "node:assert/strict";
import { transform } from "esbuild";
import { UI_KIT_EXPORTS, UI_KIT_SOURCE } from "../lib/uiKit";
import { validateProject } from "../lib/validate";
import { toRepoFiles } from "../lib/exportProject";

test("the kit compiles as a plain ES module (no JSX, no syntax slips)", async () => {
  const out = await transform(UI_KIT_SOURCE, { loader: "js", format: "esm", target: "es2019" });
  assert.ok(out.code.length > 1000);
});

test("the export list matches what the module really exports", () => {
  const named = [...UI_KIT_SOURCE.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort();
  assert.deepEqual(named, [...UI_KIT_EXPORTS].sort());
});

test("the kit uses no template literals or JSX, so it survives String.raw and the data: URL import", () => {
  assert.ok(!UI_KIT_SOURCE.includes("`"));
  assert.ok(!UI_KIT_SOURCE.includes("${"));
});

test("every animated piece can jump to its final state for screenshots", () => {
  assert.match(UI_KIT_SOURCE, /lovable-ui:reveal-all/);
  // useInView (Reveal and Stagger) and Counter both listen for it.
  assert.equal((UI_KIT_SOURCE.match(/onRevealAll\(/g) ?? []).length >= 3, true);
});

test("the validator accepts real kit imports and reports unknown ones", async () => {
  const ok = await validateProject({
    "/App.js": 'import { Reveal, Counter } from "lovable-ui";\nexport default function App(){ return <Reveal><Counter to={5} /></Reveal>; }',
  });
  assert.deepEqual(ok.filter((i) => i.severity === "error"), []);
  const bad = await validateProject({
    "/App.js": 'import { Reveal, Parallaxx } from "lovable-ui";\nexport default function App(){ return <Reveal />; }',
  });
  const err = bad.find((i) => i.severity === "error");
  assert.ok(err);
  assert.match(err!.message, /"Parallaxx" is not exported by lovable-ui/);
});

test("the exported project contains the kit and an alias for it", () => {
  const repo = toRepoFiles({ "/App.js": "export default function App(){return null}" }, "Demo");
  assert.equal(repo["src/lovable-ui.js"], UI_KIT_SOURCE);
  assert.match(repo["vite.config.js"], /"lovable-ui": fileURLToPath\(new URL\("\.\/src\/lovable-ui\.js"/);
});

test("made-up local image paths are errors; photo URLs, data URLs and real project files are not", async () => {
  const errors = async (src: string, extra: Record<string, string> = {}) =>
    (await validateProject({ "/App.js": src, ...extra })).filter((i) => i.severity === "error").map((i) => i.message);
  const bad = await errors('const logos=[{src:"/brand-logos/linear-gray.svg"}];\nexport default function App(){ return <img src="./img/hero.JPG" alt="" /> }');
  assert.equal(bad.length, 2);
  assert.match(bad[0], /Image "\/brand-logos\/linear-gray\.svg" does not exist/);
  const ok = await errors('const a="https://images.unsplash.com/photo-1-2?w=400"; const b="https://x.com/a.png"; const c="data:image/png;base64,AAAA";\nexport default function App(){ return <img src={a} alt="" /> }');
  assert.deepEqual(ok, []);
  assert.deepEqual(await errors('export default function App(){ return <img src="/logo.svg" alt="" /> }', { "/public/logo.svg": "<svg/>" }), []);
});
