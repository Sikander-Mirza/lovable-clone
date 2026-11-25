import { test } from "node:test";
import assert from "node:assert/strict";
import { STYLES, STYLE_IDS, styleBlock, styleById, styleMenu } from "../lib/styles";
import { parseBrief } from "../lib/siteBrief";
import { FONTS } from "../lib/theme";

test("every playbook has an id, a use line and a concrete recipe with real class snippets", () => {
  assert.ok(STYLES.length >= 6);
  assert.equal(new Set(STYLE_IDS).size, STYLE_IDS.length);
  for (const s of STYLES) {
    assert.match(s.id, /^[a-z]+(-[a-z]+)*$/);
    assert.ok(s.use.length > 30, s.id + " use");
    assert.ok(s.recipe.length > 1500, s.id + " recipe is long enough to be specific");
    assert.match(s.recipe, /className="|<div className/, s.id + " has class snippets");
    assert.ok(!s.recipe.includes("`") && !s.recipe.includes("${"), s.id + " has no template characters");
  }
});

test("playbooks only name fonts that exist in the theme font list", () => {
  const known = FONTS as readonly string[];
  const wanted = ["Sora", "Space Grotesk", "Bricolage Grotesque", "Inter", "Manrope", "Instrument Serif", "Fraunces", "Cormorant Garamond", "Plus Jakarta Sans", "Outfit", "Nunito", "Syne", "JetBrains Mono"];
  for (const f of wanted) assert.ok(known.includes(f), f);
  for (const s of STYLES) {
    const m = s.recipe.match(/headingFont ([^;]*?)[;.]/);
    assert.ok(m, s.id + " names heading fonts");
    for (const f of m![1].split(/,| or /).map((x) => x.trim()).filter(Boolean)) {
      assert.ok(known.includes(f.replace(/ at heavy weights.*/, "")), `${s.id}: unknown font "${f}"`);
    }
  }
});

test("the block carries the playbook and says the plan's colors and fonts still win", () => {
  const b = styleBlock("dark-tech");
  assert.match(b, /Style playbook "Dark tech"/);
  assert.match(b, /Approved plan fixes the brand color or fonts, keep those/);
  assert.match(b, /bg-neutral-950/);
  assert.equal(styleBlock("none"), "");
  assert.equal(styleBlock(null), "");
  assert.equal(styleById("luxe-dark")!.name, "Luxe dark editorial");
});

test("the classifier menu lists every playbook", () => {
  const menu = styleMenu();
  for (const id of STYLE_IDS) assert.match(menu, new RegExp("- " + id + ":"));
});

test("a brief is read from the model's JSON, tolerating prose, bad styles and the older array form", () => {
  assert.deepEqual(parseBrief('Sure: {"style":"luxe-dark","queries":["wedding photography","bride groom"]}'), {
    style: "luxe-dark",
    queries: ["wedding photography", "bride groom"],
  });
  assert.deepEqual(parseBrief('{"style":"none","queries":[]}'), { style: null, queries: [] });
  assert.deepEqual(parseBrief('{"style":"made-up","queries":["ok fine"]}'), { style: null, queries: ["ok fine"] });
  assert.deepEqual(parseBrief('["old form", "still works"]'), { style: null, queries: ["old form", "still works"] });
  assert.deepEqual(parseBrief("nothing useful"), { style: null, queries: [] });
});
