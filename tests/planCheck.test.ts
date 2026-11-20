import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPlan, planFixPrompt } from "../lib/planCheck";
import { applyDeletes, parseAssistant } from "../lib/parse";
import type { Plan } from "../lib/plan";

const sec = (title: string, include = true) => ({ title, purpose: "", layout: "", content: "", include });
const plan: Plan = {
  kind: "site",
  direction: "x",
  brand: "#0066cc",
  font: "Inter",
  headingFont: "Inter",
  pages: ["Home"],
  sections: [sec("Hero"), sec("Our Services"), sec("Patient Voices"), sec("Confidence Bar", false), sec("Location & Access")],
  features: ["Emergency call sticky button"],
};
const app = (...cs: string[]) => `export default function App(){ return <main>${cs.map((c) => `<${c} />`).join("")}</main> }`;

test("a build that follows the plan passes (layout pieces and feature widgets are allowed)", () => {
  const files = { "/App.js": app("Navbar", "Hero", "Services", "PatientVoices", "LocationAccess", "Footer", "EmergencyButton") };
  assert.equal(checkPlan(files, plan), null);
});

test("an extra section is reported", () => {
  const r = checkPlan({ "/App.js": app("Navbar", "Hero", "Services", "FAQ", "PatientVoices", "Location", "Footer") }, plan)!;
  assert.deepEqual(r.extra, ["FAQ"]);
  assert.deepEqual(r.missing, []);
});

test("an unticked section that was built anyway counts as extra, a missing one is reported", () => {
  const r = checkPlan({ "/App.js": app("Hero", "ConfidenceBar", "Services", "Location") }, plan)!;
  assert.deepEqual(r.extra, ["ConfidenceBar"]);
  assert.deepEqual(r.missing, ["Patient Voices"]);
});

test("multi-page and routed sites are not checked", () => {
  const files = { "/App.js": "import { Routes } from 'react-router-dom'; export default () => <Routes/>" };
  assert.equal(checkPlan(files, plan), null);
  // A multi-page plan on a site without a /pages folder is not judged.
  assert.equal(checkPlan({ "/App.js": app("Hero", "Pricing") }, { ...plan, pages: ["Home", "About"] }), null);
});

test("a router wrapper around one page is still checked; short names and feature widgets match", () => {
  const p: Plan = { ...plan, sections: [sec("Hero"), sec("Medical Team"), sec("Location & Access")], features: ["Interactive treatment FAQs", "Emergency call shortcut"] };
  const wrapped = (...cs: string[]) =>
    `import { HashRouter as Router } from 'react-router-dom'; export default function App(){ return <Router><main>${cs.map((c) => `<${c} />`).join("")}</main></Router> }`;
  // Team ~ Medical Team, FAQ is a planned feature, EmergencyFAB is a planned feature
  assert.equal(checkPlan({ "/App.js": wrapped("Hero", "Team", "Location", "FAQ", "EmergencyFAB") }, p), null);
  // a genuinely unplanned section is still caught through the wrapper
  assert.deepEqual(checkPlan({ "/App.js": wrapped("Hero", "Team", "Location", "Newsletter") }, p)!.extra, ["Newsletter"]);
});

test("the fix prompt names what to remove and what to add", () => {
  const t = planFixPrompt({ extra: ["FAQ"], missing: ["Patient Voices"] });
  assert.match(t, /must be removed: FAQ/);
  assert.match(t, /<delete path=/);
  assert.match(t, /missing: Patient Voices/);
});

test("<delete> is parsed, hidden from the prose, and never removes App.js or the theme", () => {
  const r = parseAssistant('Removing it.\n<delete path="/components/FAQ.js" />\n<delete path="/App.js"/>');
  assert.deepEqual(r.deletes, ["/components/FAQ.js", "/App.js"]);
  assert.equal(r.text, "Removing it.");
  const out = applyDeletes({ "/App.js": "a", "/components/FAQ.js": "b", "/theme.json": "{}" }, r.deletes);
  assert.deepEqual(Object.keys(out).sort(), ["/App.js", "/theme.json"]);
});

const multi: Plan = {
  ...plan,
  pages: ["Home", "Menu"],
  features: [],
  sections: [
    { ...sec("Hero"), page: "Home" },
    { ...sec("Highlights"), page: "Home" },
    { ...sec("Bread"), page: "Menu" },
  ],
};
const page = (imports: string[], icons: string[] = []) =>
  [
    ...imports.map((c) => `import ${c} from "../components/${c}";`),
    `import { ${icons.join(", ")} } from "lucide-react";`,
    `export default function P(){ return <div>${[...imports, ...icons].map((c) => `<${c} />`).join("")}</div> }`,
  ].join("\n");

test("multi-page: pages that render their planned sections pass, icons are ignored", () => {
  const files = {
    "/App.js": "export default function App(){ return <Routes/> }",
    "/pages/Home.js": page(["Hero", "Highlights"], ["ArrowRight"]),
    "/pages/Menu.js": page(["Bread"]),
  };
  assert.equal(checkPlan(files, multi), null);
});

test("multi-page: an extra section, a missing section and a missing page are reported with their page", () => {
  const r = checkPlan(
    { "/pages/Home.js": page(["Hero", "Newsletter"]) },
    multi
  )!;
  assert.deepEqual(r.extra, ["Newsletter (on Home)"]);
  assert.deepEqual(r.missing, ["Highlights (on Home)"]); // Bread is covered by the missing Menu page
  assert.deepEqual(r.missingPages, ["Menu"]);
  const t = planFixPrompt(r);
  assert.match(t, /Planned pages that are missing: Menu/);
  assert.match(t, /Newsletter \(on Home\)/);
});

test("multi-page: a section written inline in the page file counts when its component file exists", () => {
  const files = {
    "/pages/Home.js": page(["Hero"]),
    "/components/Highlights.js": "export default function H(){return null}",
    "/pages/Menu.js": page(["Bread"]),
  };
  assert.equal(checkPlan(files, multi), null);
});
