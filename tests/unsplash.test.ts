import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQueries, photosBlock, photosForQueries, searchPhotos, toPhoto, wantsPhotos } from "../lib/unsplash";

const api = (over: Record<string, unknown> = {}) => ({
  urls: { raw: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?ixid=abc&ixlib=rb-4.1.0" },
  alt_description: "a bride and groom walking on a hill",
  width: 5184,
  height: 3456,
  ...over,
});

test("an API result becomes a photo with its path, alt text and shape", () => {
  assert.deepEqual(toPhoto(api()), { path: "photo-1532712938310-34cb3982ef74", alt: "a bride and groom walking on a hill", shape: "landscape" });
  assert.equal(toPhoto(api({ width: 3000, height: 4500 }))!.shape, "portrait");
  assert.equal(toPhoto(api({ width: 3000, height: 3050 }))!.shape, "square");
});

test("premium, nameless and malformed results are dropped", () => {
  assert.equal(toPhoto(api({ urls: { raw: "https://plus.unsplash.com/premium_photo-1234-abc?x=1" } })), null);
  assert.equal(toPhoto(api({ alt_description: null, description: null })), null);
  assert.equal(toPhoto({}), null);
  assert.equal(toPhoto(null), null);
});

test("queries are read from the model's JSON, trimmed, de-duplicated and capped at 4", () => {
  assert.deepEqual(parseQueries('Sure! ["wedding photography", "  bride  groom ", "wedding photography", "x", "a", "b b", "c c", "d d"]'), [
    "wedding photography",
    "bride groom",
    "b b",
    "c c",
  ]);
  assert.deepEqual(parseQueries("[]"), []);
  assert.deepEqual(parseQueries("no json here"), []);
  assert.deepEqual(parseQueries('["ok fine", 5, null]'), ["ok fine"]);
});

test("new projects and photo requests fetch photos, the app's own prompts do not", () => {
  assert.equal(wantsPhotos({}, "A website for a bakery"), true);
  assert.equal(wantsPhotos({ "/App.js": "x" }, "Make the footer darker"), false);
  assert.equal(wantsPhotos({ "/App.js": "x" }, "Add a photo gallery to the about page"), true);
  assert.equal(wantsPhotos({}, "The preview crashed with this runtime error: images"), false);
  assert.equal(wantsPhotos({ "/App.js": "x" }, "Do a visual design review. Attached are images"), false);
});

test("the photo block lists each photo once under the first query that found it", () => {
  const p = { path: "photo-1", alt: "a", shape: "landscape" as const };
  const q = { path: "photo-2", alt: "b", shape: "portrait" as const };
  const block = photosBlock([
    { query: "wedding", photos: [p] },
    { query: "bride", photos: [p, q] },
    { query: "empty", photos: [] },
  ]);
  assert.match(block, /Matched photos/);
  assert.equal((block.match(/photo-1/g) ?? []).length, 1);
  assert.match(block, /- bride:\n {2}photo-2 \(portrait\): b/);
  assert.ok(!block.includes("empty"));
  assert.equal(photosBlock([{ query: "x", photos: [] }]), "");
});

test("searching caches results and fails loudly on an API error", async () => {
  let calls = 0;
  const ok = (async () => {
    calls++;
    return { ok: true, status: 200, json: async () => ({ results: [api(), { urls: {} }] }) };
  }) as unknown as typeof fetch;
  const a = await searchPhotos("Unique Query One", "k", 8, ok);
  const b = await searchPhotos("unique query one", "k", 8, ok);
  assert.equal(a.length, 1);
  assert.deepEqual(a, b);
  assert.equal(calls, 1);
  const bad = (async () => ({ ok: false, status: 403, json: async () => ({}) })) as unknown as typeof fetch;
  await assert.rejects(searchPhotos("another one", "k", 8, bad), /Unsplash 403/);
});

test("no queries means no photo block, and failing searches are skipped", async () => {
  assert.equal(await photosForQueries([], "k"), "");
});
