import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPlan, parsePlan } from "../lib/plan";

const good = JSON.stringify({
  kind: "site",
  direction: "Warm editorial look with serif headings.",
  brand: "#166534",
  font: "Inter",
  headingFont: "Playfair Display",
  pages: ["Home"],
  sections: [
    { title: "Hero", purpose: "Hook", layout: "Full-bleed photo with the headline bottom-left", content: "Tagline and hours" },
    { title: "Story", purpose: "Trust", layout: "Two column editorial text", content: "Founding story" },
    { title: "Menu", purpose: "Sell", layout: "Price list with leader dots", content: "12 drinks" },
    { title: "Visit", purpose: "Convert", layout: "Map beside opening hours", content: "Address" },
  ],
  features: ["Contact form"],
});

test("a valid plan is parsed even when wrapped in prose or fences", () => {
  const p = parsePlan("Here is the plan:\n```json\n" + good + "\n```")!;
  assert.equal(p.kind, "site");
  assert.equal(p.sections.length, 4);
  assert.equal(p.headingFont, "Playfair Display");
  assert.ok(p.sections.every((s) => s.include));
});

test("invalid colors and unknown fonts fall back to safe defaults", () => {
  const p = parsePlan(JSON.stringify({ ...JSON.parse(good), brand: "green", font: "Comic Sans", headingFont: "Nope" }))!;
  assert.match(p.brand, /^#[0-9a-f]{6}$/);
  assert.equal(p.font, "Inter");
  assert.equal(p.headingFont, "Inter");
});

test("the tool kind, broken JSON and plans with too few sections are handled", () => {
  assert.equal(parsePlan('{"kind":"tool"}')!.kind, "tool");
  assert.equal(parsePlan("not json at all"), null);
  assert.equal(parsePlan(JSON.stringify({ kind: "site", sections: [{ title: "Only one" }] })), null);
});

test("the formatted plan lists only included sections, in order, with theme and layouts", () => {
  const p = parsePlan(good)!;
  p.sections[1].include = false;
  [p.sections[2], p.sections[3]] = [p.sections[3], p.sections[2]];
  const text = formatPlan(p);
  assert.match(text, /Approved plan/);
  assert.match(text, /"brand":"#166534","font":"Inter","headingFont":"Playfair Display"/);
  assert.ok(!text.includes("Story"));
  assert.ok(text.indexOf("Visit") < text.indexOf("Menu"));
  assert.match(text, /Layout: Map beside opening hours/);
  assert.match(text, /Do not add sections/);
});
