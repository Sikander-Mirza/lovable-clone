import { test } from "node:test";
import assert from "node:assert/strict";
import { brandCheck, brandFixPrompt } from "../lib/brandCheck";

const comp = (cls: string) => `export default function C(){ return <div className="${cls}" /> }`;

test("a site that only uses brand-* and neutral colors passes", () => {
  const files = {
    "/App.js": comp("bg-brand-600 text-gray-900 hover:bg-brand-700"),
    "/components/Hero.js": comp("bg-brand-950 text-white border-gray-200"),
  };
  assert.equal(brandCheck(files), null);
});

test("a couple of stray blue classes are tolerated", () => {
  assert.equal(brandCheck({ "/components/Link.js": comp("text-blue-600 hover:text-blue-700") }), null);
});

test("a single hardcoded background or gradient is flagged, even with a variant prefix", () => {
  assert.equal(brandCheck({ "/components/Cta.js": comp("bg-indigo-600 text-white") })!.total, 1);
  assert.equal(brandCheck({ "/components/Cta.js": comp("hover:bg-violet-500") })!.total, 1);
  assert.equal(brandCheck({ "/components/Cta.js": comp("from-blue-500 to-white") })!.total, 1);
});

test("hardcoded indigo/violet/blue accents are counted per file, worst first, including variants", () => {
  const r = brandCheck({
    "/App.js": comp("bg-white"),
    "/components/Hero.js": comp("bg-indigo-950 text-indigo-200 from-violet-500 to-purple-600 hover:bg-indigo-700"),
    "/components/Nav.js": comp("text-indigo-700 border-blue-200"),
    "/theme.json": '{"brand":"#111827"} bg-indigo-600 bg-indigo-600 bg-indigo-600',
  })!;
  assert.equal(r.total, 7);
  assert.deepEqual(r.files.map((f) => [f.file, f.count]), [["/components/Hero.js", 5], ["/components/Nav.js", 2]]);
  assert.ok(r.files[0].examples.includes("bg-indigo-950"));
});

test("the fix prompt names the files and keeps the change small", () => {
  const r = brandCheck({ "/components/Hero.js": comp("bg-indigo-600 text-indigo-700 border-indigo-200") })!;
  const t = brandFixPrompt(r);
  assert.match(t, /\/components\/Hero\.js: 3/);
  assert.match(t, /bg-indigo-600 becomes bg-brand-600/);
  assert.match(t, /Change nothing else/);
});
