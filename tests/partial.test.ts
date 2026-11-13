import { test } from "node:test";
import assert from "node:assert/strict";
import { withStubs } from "../lib/partial";

test("missing local imports get an empty placeholder; existing ones are untouched", () => {
  const files = {
    "/App.js": 'import Hero from "./components/Hero";\nimport Faq from "./components/Faq.js";\nimport x from "react";',
    "/components/Hero.js": "export default function Hero(){return null}",
  };
  const out = withStubs(files);
  assert.equal(out["/components/Hero.js"], files["/components/Hero.js"]);
  assert.match(out["/components/Faq.js"], /Pending/);
  assert.deepEqual(Object.keys(out).sort(), ["/App.js", "/components/Faq.js", "/components/Hero.js"]);
});
