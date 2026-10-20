import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS, guessType } from "../lib/questionnaire";
import { suggestionsFor } from "../lib/suggestions";

test("site type is guessed from the prompt", () => {
  assert.equal(guessType("a website for my coffee shop"), "Restaurant / cafe");
  assert.equal(guessType("my portfolio"), "Portfolio");
  assert.equal(guessType("make me a website"), null);
});

test("questionnaire is well formed", () => {
  const ids = new Set(QUESTIONS.map((q) => q.id));
  assert.equal(ids.size, QUESTIONS.length);
  for (const q of QUESTIONS) assert.ok(q.question.endsWith("?"));
});

test("suggestions only offer what the project is missing", () => {
  assert.deepEqual(suggestionsFor({}), []);
  const labels = suggestionsFor({ "/App.js": "<section>Testimonials</section><form></form>" }, 9).map((s) => s.label);
  assert.ok(!labels.includes("Add testimonials"));
  assert.ok(!labels.includes("Add contact form"));
  assert.ok(labels.includes("Add pricing"));
});
