import { test } from "node:test";
import assert from "node:assert/strict";
import { compactFiles, restoreAll } from "../lib/assets";

test("big embedded images are swapped for placeholders and restored exactly", () => {
  const big = "data:image/jpeg;base64," + "A1b2".repeat(5000);
  const files = { "/App.js": `<img src="${big}"/><img src="https://x.test/a.png"/>` };
  const { files: compact, table } = compactFiles(files);
  assert.ok(compact["/App.js"].length < 200);
  assert.ok(compact["/App.js"].includes("https://x.test/a.png"));
  const edited = compact["/App.js"] + " // model edit";
  assert.equal(restoreAll({ "/App.js": edited }, table)["/App.js"], files["/App.js"] + " // model edit");
});

test("small data URLs are left alone", () => {
  const files = { "/a.js": 'src="data:image/svg+xml,%3Csvg%3E"' };
  assert.deepEqual(compactFiles(files).files, files);
});

test("image placeholders inside edit blocks are restored so SEARCH matches the real file", async () => {
  const { restoreEdits } = await import("../lib/assets");
  const { applyEdits } = await import("../lib/edits");
  const big = "data:image/jpeg;base64," + "A1b2".repeat(5000);
  const files = { "/App.js": `<img src="${big}" alt="a"/>` };
  const { files: compact, table } = compactFiles(files);
  const placeholder = /data:image\/jpeg;base64,\[omitted:[a-z0-9]+\]/.exec(compact["/App.js"])![0];
  const edits = restoreEdits([{ path: "/App.js", blocks: [{ search: `src="${placeholder}" alt="a"`, replace: `src="${placeholder}" alt="b"` }] }], table);
  const { files: out, failures } = applyEdits(files, edits);
  assert.deepEqual(failures, []);
  assert.equal(out["/App.js"], `<img src="${big}" alt="b"/>`);
});
