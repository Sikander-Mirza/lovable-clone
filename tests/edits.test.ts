import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdits, parseBlocks } from "../lib/edits";
import { parseAssistant } from "../lib/parse";

const files = { "/App.js": "const a = 1;\nconst b = 2;\nexport default () => a + b;" };

test("a SEARCH/REPLACE edit is parsed from the assistant text and applied", () => {
  const raw = [
    "Changing b.",
    '<edit path="/App.js">',
    "<<<<<<< SEARCH",
    "const b = 2;",
    "=======",
    "const b = 20;",
    ">>>>>>> REPLACE",
    "</edit>",
    "Done.",
  ].join("\n");
  const parsed = parseAssistant(raw);
  assert.equal(parsed.edits.length, 1);
  assert.equal(parsed.text, "Changing b.\n\nDone.".replace("\n\n", "\n\n"));
  const { files: out, failures } = applyEdits(files, parsed.edits);
  assert.deepEqual(failures, []);
  assert.equal(out["/App.js"], "const a = 1;\nconst b = 20;\nexport default () => a + b;");
});

test("multiple blocks apply in order, and an empty replacement deletes text", () => {
  const blocks = parseBlocks("<<<<<<< SEARCH\nconst a = 1;\n=======\nconst a = 5;\n>>>>>>> REPLACE\n<<<<<<< SEARCH\nconst b = 2;\n=======\n>>>>>>> REPLACE");
  assert.equal(blocks.length, 2);
  const { files: out } = applyEdits(files, [{ path: "/App.js", blocks }]);
  assert.equal(out["/App.js"], "const a = 5;\n\nexport default () => a + b;");
});

test("missing, ambiguous and unknown-file edits fail without touching the file", () => {
  const dup = { "/A.js": "x\nx" };
  const r1 = applyEdits(dup, [{ path: "/A.js", blocks: [{ search: "x", replace: "y" }] }]);
  assert.match(r1.failures[0].reason, /appears 2 times/);
  assert.equal(r1.files["/A.js"], "x\nx");

  const r2 = applyEdits(files, [{ path: "/App.js", blocks: [{ search: "nope", replace: "y" }] }]);
  assert.match(r2.failures[0].reason, /not found/);

  const r3 = applyEdits(files, [{ path: "/Missing.js", blocks: [{ search: "a", replace: "b" }] }]);
  assert.match(r3.failures[0].reason, /does not exist/);
});

test("replacement text with $ patterns is inserted literally", () => {
  const { files: out } = applyEdits({ "/a.js": "price" }, [{ path: "/a.js", blocks: [{ search: "price", replace: "$& and $1" }] }]);
  assert.equal(out["/a.js"], "$& and $1");
});

test("a half-streamed edit is hidden from the prose and reported as open", () => {
  const r = parseAssistant('On it.\n<edit path="/App.js">\n<<<<<<< SEARCH\nconst');
  assert.equal(r.openEditPath, "/App.js");
  assert.equal(r.text, "On it.");
  assert.deepEqual(r.edits, []);
});
