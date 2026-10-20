import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimitOk, guardRequest } from "../lib/guard";

test("rate limit allows up to the limit, then blocks, then resets after the window", () => {
  const ip = "1.2.3.4";
  assert.ok(rateLimitOk(ip, 2, 1000));
  assert.ok(rateLimitOk(ip, 2, 2000));
  assert.ok(!rateLimitOk(ip, 2, 3000));
  assert.ok(rateLimitOk(ip, 2, 1000 + 60 * 60 * 1000 + 1));
});

test("oversized bodies are rejected with 413", async () => {
  const req = new Request("http://x/api", { method: "POST", headers: { "content-length": "9000000" }, body: "x" });
  assert.equal((await guardRequest(req))?.status, 413);
});

test("REQUIRE_AUTH rejects callers without a valid token", async () => {
  process.env.REQUIRE_AUTH = "true";
  try {
    const res = await guardRequest(new Request("http://x/api", { method: "POST", body: "x" }));
    assert.equal(res?.status, 401);
  } finally {
    delete process.env.REQUIRE_AUTH;
  }
});
