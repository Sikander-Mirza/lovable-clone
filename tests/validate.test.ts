import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProject } from "../lib/validate";

const ok = "export default function App(){ return <div className='p-4'>Hi</div> }";

test("a clean project has no issues", async () => {
  assert.deepEqual(await validateProject({ "/App.js": ok }), []);
});

test("syntax errors are reported with a location", async () => {
  const issues = await validateProject({ "/App.js": "export default function App(){ return <div> }" });
  assert.ok(issues.some((i) => i.severity === "error" && /Syntax error/.test(i.message)));
});

test("missing files, unavailable packages and invented icons are caught", async () => {
  const files = {
    "/App.js": [
      "import Missing from './components/Nope';",
      "import axios from 'axios';",
      "import { Coffee, TotallyFakeIcon } from 'lucide-react';",
      "export default function App(){ return <Coffee/> }",
    ].join("\n"),
  };
  const msgs = (await validateProject(files)).map((i) => i.message).join("\n");
  assert.match(msgs, /Cannot find file ".\/components\/Nope"/);
  assert.match(msgs, /Package "axios"/);
  assert.match(msgs, /Icon "TotallyFakeIcon"/);
  assert.doesNotMatch(msgs, /Icon "Coffee"/);
});

test("relative imports resolve with extensions and index files", async () => {
  const files = {
    "/App.js": "import A from './components/A';\nimport B from './b';\nexport default function App(){ return <><A/><B/></> }",
    "/components/A.js": "export default () => null",
    "/b/index.js": "export default () => null",
  };
  assert.deepEqual(await validateProject(files), []);
});

test("unknown photo ids are warnings, a missing default export is an error", async () => {
  const issues = await validateProject({ "/App.js": "export const x = <img src='https://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa'/>;" });
  assert.ok(issues.some((i) => i.severity === "warn" && /not in the approved library/.test(i.message)));
  assert.ok(issues.some((i) => i.severity === "error" && /export default/.test(i.message)));
});
