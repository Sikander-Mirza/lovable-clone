import { test } from "node:test";
import assert from "node:assert/strict";
import { planSlices } from "../lib/image";

test("normal and slightly tall images stay in one piece", () => {
  assert.deepEqual(planSlices(1440, 900, 4), [{ y: 0, h: 900 }]);
  assert.deepEqual(planSlices(1000, 2000, 4), [{ y: 0, h: 2000 }]); // exactly 2x is not "tall"
});

test("a full-page screenshot is cut into overlapping slices that cover every pixel", () => {
  const w = 1440;
  const h = 7200;
  const slices = planSlices(w, h, 4);
  assert.equal(slices.length, 4);
  assert.equal(slices[0].y, 0);
  assert.equal(slices[slices.length - 1].y + slices[slices.length - 1].h, h);
  for (let i = 1; i < slices.length; i++) {
    const prevEnd = slices[i - 1].y + slices[i - 1].h;
    assert.ok(slices[i].y < prevEnd, "neighbouring slices overlap");
    assert.ok(slices[i].y > slices[i - 1].y);
  }
  // Each slice is about as tall as it is wide, so it stays readable at 1280px.
  for (const s of slices) assert.ok(s.h <= 2 * w);
});

test("the number of slices follows the height and never exceeds the room left", () => {
  assert.equal(planSlices(1000, 2500, 4).length, 2);
  assert.equal(planSlices(1000, 9000, 4).length, 4);
  assert.equal(planSlices(1000, 9000, 3).length, 3);
  assert.deepEqual(planSlices(1000, 9000, 1), [{ y: 0, h: 9000 }]); // no room for more than one image
  assert.deepEqual(planSlices(0, 100, 4), [{ y: 0, h: 100 }]);
});
