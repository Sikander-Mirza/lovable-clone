import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturn, seal, unseal } from "../lib/session";

test("sealed values round-trip and tampering is rejected", () => {
  const sealed = seal({ token: "abc", login: "octocat" });
  assert.deepEqual(unseal(sealed), { token: "abc", login: "octocat" });
  const tampered = sealed.slice(0, -3) + (sealed.endsWith("AAA") ? "BBB" : "AAA");
  assert.equal(unseal(tampered), null);
  assert.equal(unseal(undefined), null);
});

test("return paths must be same-site relative paths", () => {
  assert.equal(safeReturn("/project/1"), "/project/1");
  assert.equal(safeReturn("//evil.com"), "/");
  assert.equal(safeReturn("https://evil.com"), "/");
  assert.equal(safeReturn(null), "/");
});
