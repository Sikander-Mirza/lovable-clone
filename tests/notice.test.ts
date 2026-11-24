import { test } from "node:test";
import assert from "node:assert/strict";
import { splitNotice } from "../lib/notice";

test("a leading notice line is split from the reply", () => {
  const r = splitNotice("[notice] Backup model in use.\nDirection: warm\n<file path=\"/App.js\">");
  assert.equal(r.notice, "Backup model in use.");
  assert.equal(r.raw, 'Direction: warm\n<file path="/App.js">');
});

test("text without a notice is untouched, and a notice that is still streaming is held back", () => {
  assert.deepEqual(splitNotice("Hello"), { raw: "Hello", notice: null });
  assert.deepEqual(splitNotice("[notice] Backup mo"), { raw: "", notice: "Backup mo" });
});

import { flowText } from "../lib/flow";

test("the landing caption describes what Build will do for each option mix", () => {
  assert.equal(
    flowText(true, true, true),
    "When you press Build, the AI will ask a few quick questions, show you a plan to edit, build the site and expand it into a fuller version."
  );
  assert.equal(flowText(false, false, false), "When you press Build, the AI will build the site.");
  assert.equal(flowText(false, true, false), "When you press Build, the AI will show you a plan to edit and build the site.");
});

test("the caption mentions the screenshot check only when it is on", () => {
  assert.equal(
    flowText(false, false, false, true),
    "When you press Build, the AI will build the site and check the result from screenshots and fix layout problems."
  );
  assert.equal(
    flowText(true, true, true, true),
    "When you press Build, the AI will ask a few quick questions, show you a plan to edit, build the site, expand it into a fuller version and check the result from screenshots and fix layout problems."
  );
});
