import { test } from "node:test";
import assert from "node:assert/strict";
import { isThumb } from "../lib/thumb";

test("only small jpeg data urls are accepted as thumbnails", () => {
  assert.ok(isThumb("data:image/jpeg;base64,/9j/4AAQ"));
  assert.ok(!isThumb("data:image/png;base64,AAAA"));
  assert.ok(!isThumb("https://evil.example/x.jpg"));
  assert.ok(!isThumb("data:image/jpeg;base64," + "A".repeat(100_000)));
  assert.ok(!isThumb(42));
});
