import { test } from "node:test";
import assert from "node:assert/strict";
import { newShareId, shareUrl, validShareId } from "../lib/share";

test("share ids are 10 lowercase letters or digits and differ each time", () => {
  const a = newShareId();
  assert.match(a, /^[a-z0-9]{10}$/);
  assert.notEqual(a, newShareId());
  assert.equal(newShareId(() => new Uint8Array(10)), "aaaaaaaaaa");
});

test("only well-formed ids are accepted and urls have no double slash", () => {
  assert.ok(validShareId("abc123def4"));
  assert.ok(!validShareId("short"));
  assert.ok(!validShareId("ABC123DEF4"));
  assert.ok(!validShareId("abc123def4/../x"));
  assert.equal(shareUrl("https://x.app/", "abc123def4"), "https://x.app/s/abc123def4");
});
