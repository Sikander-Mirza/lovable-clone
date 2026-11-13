import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, healthFixPrompt, probeChecks, score, staticChecks, type Probe } from "../lib/health";

const byId = (cs: ReturnType<typeof staticChecks>, id: string) => cs.find((c) => c.id === id)!;

test("WCAG contrast: black on white is 21:1, same color is 1:1", () => {
  assert.equal(Math.round(contrast("#000000", "#ffffff")), 21);
  assert.equal(contrast("#336699", "#336699"), 1);
});

test("SEO checks read /site.json and grade the lengths", () => {
  const none = staticChecks({ "/App.js": "x" });
  assert.equal(byId(none, "seo-title").status, "fail");
  assert.equal(byId(none, "seo-description").status, "fail");
  const good = staticChecks({
    "/App.js": "x",
    "/site.json": JSON.stringify({ seo: { title: "Smile Dental | Family dentist in Lahore", description: "Gentle family dentistry with online booking and same-day emergency visits in Lahore.", image: "https://x.test/a.jpg" } }),
  });
  assert.equal(byId(good, "seo-title").status, "pass");
  assert.equal(byId(good, "seo-description").status, "pass");
  assert.equal(byId(good, "seo-image").status, "pass");
});

test("brand contrast is graded against white text", () => {
  const dark = staticChecks({ "/App.js": "x", "/theme.json": JSON.stringify({ brand: "#0b3d91" }) });
  const light = staticChecks({ "/App.js": "x", "/theme.json": JSON.stringify({ brand: "#7dd3fc" }) });
  assert.equal(byId(dark, "a11y-contrast").status, "pass");
  assert.equal(byId(light, "a11y-contrast").status, "fail");
});

test("responsive classes, fixed widths, lazy images and photo sizes are counted from the code", () => {
  const weak = staticChecks({ "/App.js": '<div className="w-[900px]"><img src="https://images.unsplash.com/photo-1?w=2400" /></div>' });
  assert.equal(byId(weak, "mobile-responsive").status, "fail");
  assert.equal(byId(weak, "mobile-fixed-width").status, "warn");
  assert.equal(byId(weak, "speed-lazy").status, "fail");
  assert.equal(byId(weak, "speed-photo-size").status, "warn");
  const strong = staticChecks({
    "/App.js": '<div className="md:grid-cols-3 sm:p-4 lg:p-8 md:p-6 sm:text-lg md:text-xl lg:text-2xl sm:gap-2 md:gap-4"><img loading="lazy" src="https://images.unsplash.com/photo-1?w=1200" /></div>',
  });
  assert.equal(byId(strong, "mobile-responsive").status, "pass");
  assert.equal(byId(strong, "speed-lazy").status, "pass");
  assert.equal(byId(strong, "speed-photo-size").status, "pass");
});

const clean: Probe = { h1Count: 1, headingSkips: 0, imgsTotal: 4, imgsNoAlt: 0, buttonsNoName: 0, inputsNoLabel: 0, scrollWidth: 390, clientWidth: 390 };

test("live probe: a clean page passes everything", () => {
  assert.ok(probeChecks(clean).every((c) => c.status === "pass"));
});

test("live probe: problems are reported with details", () => {
  const bad = probeChecks({ ...clean, h1Count: 2, imgsNoAlt: 3, buttonsNoName: 2, inputsNoLabel: 1, scrollWidth: 520, headingSkips: 1 });
  const status = (id: string) => bad.find((c) => c.id === id)!.status;
  assert.equal(status("seo-h1"), "fail");
  assert.equal(status("a11y-alt"), "fail");
  assert.equal(status("a11y-buttons"), "fail");
  assert.equal(status("a11y-labels"), "fail");
  assert.equal(status("mobile-overflow"), "fail");
  assert.equal(status("a11y-heading-order"), "warn");
  assert.match(bad.find((c) => c.id === "mobile-overflow")!.detail!, /520px wide on a 390px/);
});

test("score weighs pass, warn and fail; skipped checks do not count", () => {
  const mk = (status: "pass" | "warn" | "fail" | "skip") => ({ id: status, group: "SEO" as const, label: status, status });
  assert.equal(score([mk("pass"), mk("pass")]), 100);
  assert.equal(score([mk("pass"), mk("fail")]), 50);
  assert.equal(score([mk("pass"), mk("warn"), mk("skip")]), 75);
  assert.equal(score([]), 0);
});

test("the fix prompt lists only problems that have a fix instruction", () => {
  const checks = [...staticChecks({ "/App.js": "x" }), ...probeChecks({ ...clean, imgsNoAlt: 2 })];
  const prompt = healthFixPrompt(checks);
  assert.match(prompt, /\[SEO\] Page title/);
  assert.match(prompt, /\[Accessibility\] Images have alt text/);
  assert.doesNotMatch(prompt, /No sideways scrolling/);
  assert.equal(healthFixPrompt(probeChecks(clean)), "");
});
