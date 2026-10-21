import { test } from "node:test";
import assert from "node:assert/strict";
import { SYSTEM_PROMPT, EXPAND_PROMPT } from "../lib/prompt";

// The design directive is a core rule: it must stay in the system prompt word for word.
const DIRECTIVE =
  "Design specifically for this business, audience, and content. Establish a clear visual direction before writing code. Choose section layouts based on their purpose. Avoid automatically using centered heroes, equal-sized feature cards, decorative gradients, pill badges, and repeated rounded containers. Use those patterns only when they support the chosen direction. Create character through typography, composition, imagery, and content hierarchy. Preserve usability and accessibility.";

test("the design directive is in the system prompt verbatim", () => {
  assert.ok(SYSTEM_PROMPT.includes(DIRECTIVE));
});

test("no older rule pushes the generic patterns the directive forbids", () => {
  assert.doesNotMatch(SYSTEM_PROMPT, /cards and grids/i);
  assert.doesNotMatch(SYSTEM_PROMPT, /highlights, gradients/i);
  assert.doesNotMatch(SYSTEM_PROMPT, /use a gradient instead of a photo/i);
});

test("the model is asked to state its visual direction, and expansion keeps it", () => {
  assert.match(SYSTEM_PROMPT, /state the visual direction/);
  assert.match(EXPAND_PROMPT, /visual direction/);
});
