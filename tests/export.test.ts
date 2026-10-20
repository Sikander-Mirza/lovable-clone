import { test } from "node:test";
import assert from "node:assert/strict";
import { toRepoFiles } from "../lib/exportProject";

test("export wraps files in a runnable Vite project with the theme and form helper", () => {
  const out = toRepoFiles(
    {
      "/App.js": "export default () => null",
      "/components/A.js": "x",
      "/theme.json": JSON.stringify({ brand: "#dc2626", font: "Poppins", headingFont: "Poppins" }),
    },
    "My Site"
  );
  for (const f of ["package.json", "vite.config.js", "index.html", "src/main.js", "src/App.js", "src/components/A.js", "src/lovable.js", "tailwind.config.js"]) {
    assert.ok(f in out, `missing ${f}`);
  }
  assert.ok(!("src/theme.json" in out));
  assert.match(out["tailwind.config.js"], /#dc2626/);
  assert.match(out["index.html"], /family=Poppins/);
  assert.match(out["vite.config.js"], /lovable/);
  assert.equal(JSON.parse(out["package.json"]).name, "my-site");
});
