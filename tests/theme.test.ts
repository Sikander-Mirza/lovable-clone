import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, brandScale, fontsHref, parseTheme, tailwindConfig } from "../lib/theme";

test("brand scale keeps the chosen color as 600 and is ordered light to dark", () => {
  const s = brandScale("#dc2626");
  assert.equal(s["600"], "#dc2626");
  const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
  const order = ["50", "100", "200", "300", "400", "600", "700", "800", "900", "950"].map((k) => lum(s[k]));
  for (let i = 1; i < order.length; i++) assert.ok(order[i] <= order[i - 1] + 1, `shade ${i} not darker`);
});

test("parseTheme falls back to defaults for missing or invalid values", () => {
  assert.deepEqual(parseTheme({}), DEFAULT_THEME);
  assert.deepEqual(parseTheme({ "/theme.json": "not json" }), DEFAULT_THEME);
  const t = parseTheme({ "/theme.json": JSON.stringify({ brand: "red", font: "Comic Sans", headingFont: "Poppins" }) });
  assert.equal(t.brand, DEFAULT_THEME.brand);
  assert.equal(t.font, DEFAULT_THEME.font);
  assert.equal(t.headingFont, "Poppins");
});

test("tailwind config and font link reflect the theme", () => {
  const t = { brand: "#059669", font: "Poppins", headingFont: "Playfair Display" };
  assert.equal(tailwindConfig(t).theme.extend.colors.brand["600"], "#059669");
  assert.match(fontsHref(t), /family=Poppins/);
  assert.match(fontsHref(t), /family=Playfair\+Display/);
});
