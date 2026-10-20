import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAssistant } from "../lib/parse";

test("parses complete file blocks and the prose around them", () => {
  const raw = 'Building it.\n<file path="/App.js">\nexport default 1;\n</file>\n<file path="/a/B.js">\nx\n</file>\nDone.';
  const r = parseAssistant(raw);
  assert.deepEqual(r.files, { "/App.js": "export default 1;", "/a/B.js": "x" });
  assert.equal(r.openPath, undefined);
  assert.match(r.text, /Building it\./);
});

test("while streaming, finished files are complete and the last one is reported as open", () => {
  const r = parseAssistant('Hi\n<file path="/App.js">\nconst a = 1;\n</file>\n<file path="/B.js">\nconst b =');
  assert.equal(r.openPath, "/B.js");
  assert.equal(r.files["/App.js"], "const a = 1;");
  assert.equal(r.files["/B.js"], "const b =");
});

test("a stream that has only started a file reports it open with the prose kept", () => {
  const r = parseAssistant('Working on it.\n<file path="/App.js">\nimp');
  assert.equal(r.openPath, "/App.js");
  assert.equal(r.text, "Working on it.");
});
