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
