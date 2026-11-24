import { test } from "node:test";
import assert from "node:assert/strict";
import { styleKey } from "../lib/previewKey";

const theme = (brand: string) => JSON.stringify({ brand, font: "Inter", headingFont: "Inter" });
const site = (lang: string) => JSON.stringify({ seo: { title: "T", description: "D", lang } });

test("the key changes with the brand color, the fonts and the site language", () => {
  const base = { "/theme.json": theme("#92400e"), "/site.json": site("en") };
  assert.equal(styleKey(base), styleKey({ ...base }));
  assert.notEqual(styleKey(base), styleKey({ ...base, "/theme.json": theme("#111111") }));
  assert.notEqual(styleKey(base), styleKey({ ...base, "/theme.json": JSON.stringify({ brand: "#92400e", font: "Poppins", headingFont: "Inter" }) }));
  assert.notEqual(styleKey(base), styleKey({ ...base, "/site.json": site("ur") }));
});

test("code changes do not change the key, and an empty shell differs from a themed site", () => {
  const base = { "/theme.json": theme("#92400e"), "/site.json": site("en"), "/App.js": "a" };
  assert.equal(styleKey(base), styleKey({ ...base, "/App.js": "b", "/components/X.js": "c" }));
  assert.notEqual(styleKey({}), styleKey(base));
});
