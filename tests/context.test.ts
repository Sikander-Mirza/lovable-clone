import { test } from "node:test";
import assert from "node:assert/strict";
import { selectContext } from "../lib/context";
import { filesContext } from "../lib/prompt";

const big = (n: number) => "x".repeat(n);
const project = (): Record<string, string> => ({
  "/App.js": "import Pricing from './components/Pricing';",
  "/theme.json": "{}",
  "/components/Hero.js": big(9000),
  "/components/Pricing.js": big(9000) + " plans monthly annual",
  "/components/Gallery.js": big(9000),
  "/components/Team.js": big(9000),
  "/components/Faq.js": big(9000),
  "/components/Footer.js": big(9000),
  "/components/Contact.js": big(9000),
});

test("a project within the budget is sent whole", () => {
  const s = selectContext({ "/App.js": "a", "/components/A.js": "b" }, "anything");
  assert.equal(s.omitted.length, 0);
  assert.equal(s.shown.length, 2);
});

test("a large project sends the entry file, the theme and the file the request names", () => {
  const files = project();
  const s = selectContext(files, "Change the Pricing section so the annual plan is highlighted", 40_000);
  assert.ok(s.shown.includes("/App.js"));
  assert.ok(s.shown.includes("/theme.json"));
  assert.ok(s.shown.includes("/components/Pricing.js"));
  assert.ok(s.omitted.length > 0);
  const used = s.shown.reduce((n, p) => n + files[p].length, 0);
  assert.ok(used <= 40_000 + 100, `used ${used}`);
  assert.deepEqual([...s.shown, ...s.omitted.map((o) => o.path)].sort(), Object.keys(files).sort());
});

test("an exact path in the request wins over everything else", () => {
  const s = selectContext(project(), "fix /components/Team.js please", 25_000);
  assert.ok(s.shown.includes("/components/Team.js"));
});

test("site-wide requests show as many (small) files as fit", () => {
  const files = { ...project(), "/components/Tiny.js": "tiny" };
  const s = selectContext(files, "improve the mobile layout everywhere", 30_000);
  assert.ok(s.shown.includes("/components/Tiny.js"));
  assert.ok(s.shown.length >= 4);
});

test("hidden files are listed, with a warning not to recreate them", () => {
  const text = filesContext(project(), "update the Pricing text");
  assert.match(text, /contents are hidden/);
  assert.match(text, /<file path="\/components\/Pricing.js">/);
  const small = filesContext({ "/App.js": "a" }, "x");
  assert.doesNotMatch(small, /hidden/);
});
