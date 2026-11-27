import { test } from "node:test";
import assert from "node:assert/strict";
import { isReviewShot, reviewPixelRatio, visualReviewPrompt } from "../lib/review";

test("screenshots are scaled down to 900px wide but never up", () => {
  assert.equal(reviewPixelRatio(1800), 0.5);
  assert.equal(reviewPixelRatio(900), 1);
  assert.equal(reviewPixelRatio(390), 1);
  assert.equal(reviewPixelRatio(0), 1);
});

test("only reasonably small jpeg data urls are accepted as review shots", () => {
  assert.ok(isReviewShot("data:image/jpeg;base64,/9j/4AAQ"));
  assert.ok(!isReviewShot("data:image/png;base64,AAAA"));
  assert.ok(!isReviewShot("data:image/jpeg;base64," + "A".repeat(1_600_000)));
  assert.ok(!isReviewShot(null));
});

test("the review prompt describes the attached screenshots and asks for small edits only", () => {
  assert.match(visualReviewPrompt(2), /first at desktop width and the second at phone width/);
  assert.match(visualReviewPrompt(1), /Attached is a screenshot/);
  assert.match(visualReviewPrompt(2), /small <edit> blocks/);
  assert.match(visualReviewPrompt(2), /If you find none, say so in one sentence and change nothing/);
});

import { probeChecks, type Probe } from "../lib/health";
import { reviewFindings } from "../lib/review";

const probe = (over: Partial<Probe> = {}): Probe => ({
  h1Count: 1, headingSkips: 0, imgsTotal: 1, imgsNoAlt: 0, buttonsNoName: 0, inputsNoLabel: 0,
  scrollWidth: 1280, clientWidth: 1280, cutOff: [], ...over,
});
const stray = { tag: "div", cls: "absolute -left-24 w-20", text: "", left: -96, right: -16 };

test("a clean page gives no findings and a passing cut-off check", () => {
  assert.equal(reviewFindings([{ label: "desktop", probe: probe() }, { label: "phone", probe: probe({ clientWidth: 390, scrollWidth: 390 }) }]), "");
  assert.equal(probeChecks(probe()).find((c) => c.id === "layout-cutoff")!.status, "pass");
});

test("elements sticking out and sideways scrolling become findings per width", () => {
  const text = reviewFindings([
    { label: "desktop", probe: probe({ cutOff: [stray] }) },
    { label: "phone", probe: probe({ clientWidth: 390, scrollWidth: 520 }) },
    { label: "skipped", probe: null },
  ]);
  assert.match(text, /At desktop width this sticks out past the screen edge: <div class="absolute -left-24 w-20"> \(left edge -96px, right edge -16px\)/);
  assert.match(text, /At phone width the page scrolls sideways \(content is 520px wide on a 390px screen\)/);
  assert.ok(!text.includes("skipped"));
});

test("the review prompt carries the measured findings, and the health check fails with a fix", () => {
  const f = reviewFindings([{ label: "desktop", probe: probe({ cutOff: [stray] }) }]);
  assert.match(visualReviewPrompt(2, f), /measured, and these layout problems were found\. Fix them first:\n- At desktop width/);
  assert.ok(!visualReviewPrompt(2).includes("measured"));
  const c = probeChecks(probe({ cutOff: [stray] })).find((x) => x.id === "layout-cutoff")!;
  assert.equal(c.status, "fail");
  assert.match(c.fix!, /absolute -left-24 w-20/);
});

test("a lonely grid and a section hugging one side become findings", () => {
  const text = reviewFindings([
    {
      label: "desktop",
      probe: probe({
        lonelyGrids: [{ cls: "grid grid-cols-3 gap-6", cols: 3, items: 4 }],
        emptySides: [{ title: "Simple pricing", side: "right", usedPercent: 38 }],
      }),
    },
  ]);
  assert.match(text, /the grid class="grid grid-cols-3 gap-6" has 3 columns but only ONE child that holds 4 items/);
  assert.match(text, /the section "Simple pricing" only uses the left 38% of the screen and leaves the other side empty/);
  assert.equal(reviewFindings([{ label: "desktop", probe: probe({ lonelyGrids: [], emptySides: [] }) }]), "");
});

test("a grid row with a hole becomes a finding", () => {
  const text = reviewFindings([{ label: "desktop", probe: probe({ raggedRows: [{ cls: "grid grid-cols-6", row: 1, emptyPx: 220 }] }) }]);
  assert.match(text, /row 1 of the grid class="grid grid-cols-6" leaves a 220px hole/);
  assert.match(text, /add up to the number of columns/);
});

test("broken images are reported once, in the review and in the health check", () => {
  const b = { src: "/brand-logos/linear.svg", alt: "Linear" };
  const text = reviewFindings([
    { label: "desktop", probe: probe({ brokenImages: [b] }) },
    { label: "phone", probe: probe({ brokenImages: [b, { src: "", alt: "" }] }) },
  ]);
  assert.equal((text.match(/linear\.svg/g) ?? []).length, 1);
  assert.match(text, /"no alt text" \(src is empty\)/);
  const check = probeChecks(probe({ brokenImages: [b] })).find((c) => c.id === "images-load")!;
  assert.equal(check.status, "fail");
  assert.equal(probeChecks(probe()).find((c) => c.id === "images-load")!.status, "pass");
});
