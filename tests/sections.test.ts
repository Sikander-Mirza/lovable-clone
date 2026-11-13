import { test } from "node:test";
import assert from "node:assert/strict";
import { LIBRARY, insertSection, listSections, moveSection, removeSection, toggleSection } from "../lib/sections";
import { validateProject } from "../lib/validate";

const APP = `import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Footer from './components/Footer';

export default function App() {
  return (
    <div>
      <Navbar />
      <main>
        <Hero />
        <Services />
      </main>
      <Footer />
    </div>
  );
}`;

const order = (app: string) => listSections(app).map((s) => `${s.name}${s.hidden ? "(hidden)" : ""}`);

test("sections are listed in order, layout pieces excluded", () => {
  assert.deepEqual(order(APP), ["Hero", "Services"]);
});

test("moving swaps neighbours and does nothing at the ends", () => {
  assert.deepEqual(order(moveSection(APP, "Services", -1)), ["Services", "Hero"]);
  assert.equal(moveSection(APP, "Hero", -1), APP);
  assert.equal(moveSection(APP, "Services", 1), APP);
});

test("hiding comments the line out and showing restores it", () => {
  const hidden = toggleSection(APP, "Hero");
  assert.deepEqual(order(hidden), ["Hero(hidden)", "Services"]);
  assert.match(hidden, /\{\/\* <Hero \/> \*\/\}/);
  assert.equal(toggleSection(hidden, "Hero"), APP);
});

test("removing drops the line and the import", () => {
  const out = removeSection(APP, "Services");
  assert.deepEqual(order(out), ["Hero"]);
  assert.doesNotMatch(out, /Services/);
  assert.match(out, /import Hero/);
});

test("inserting adds an import and the element, after a given section or at the end of main", () => {
  const afterHero = insertSection(APP, "FAQ", "Hero");
  assert.deepEqual(order(afterHero), ["Hero", "FAQ", "Services"]);
  assert.match(afterHero, /import FAQ from '.\/components\/FAQ';/);
  assert.deepEqual(order(insertSection(APP, "FAQ")), ["Hero", "Services", "FAQ"]);
  assert.equal(insertSection(afterHero, "FAQ"), afterHero); // never twice
  const bare = APP.replace(/\n\s*<Hero \/>/, "").replace(/\n\s*<Services \/>/, "");
  assert.deepEqual(order(insertSection(bare, "FAQ")), ["FAQ"]);
});

test("every library component compiles and uses only allowed imports and real icons", async () => {
  for (const item of LIBRARY) {
    const files = {
      "/App.js": `import ${item.name} from './components/${item.name}';\nexport default function App(){ return <${item.name} /> }`,
      [`/components/${item.name}.js`]: item.code,
    };
    assert.deepEqual(await validateProject(files), [], item.name);
  }
});

import { regeneratePrompt } from "../lib/sections";

test("regeneratePrompt targets one file and keeps the rest untouched", () => {
  const p = regeneratePrompt("OurStory", "more minimal");
  assert.match(p, /"Our Story" section \(\/components\/OurStory\.js\)/);
  assert.match(p, /more minimal/);
  assert.match(p, /Do not change any other file/);
  assert.match(regeneratePrompt("Hero", ""), /different layout/);
});
