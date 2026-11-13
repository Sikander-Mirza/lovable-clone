import { test } from "node:test";
import assert from "node:assert/strict";
import { toRepoFiles } from "../lib/exportProject";

test("export adds SEO tags, lang, robots.txt, sitemap and the WhatsApp button from /site.json", () => {
  const site = {
    seo: { title: "Noor Coffee House", description: "Specialty coffee in Lahore", image: "https://x.test/share.jpg", url: "https://noor.example", lang: "ur" },
    whatsapp: { enabled: true, number: "923001234567", message: "Salam" },
  };
  const out = toRepoFiles({ "/App.js": "export default () => null", "/site.json": JSON.stringify(site) }, "Fallback name");
  assert.match(out["index.html"], /<html lang="ur" dir="rtl">/);
  assert.match(out["index.html"], /<title>Noor Coffee House<\/title>/);
  assert.match(out["index.html"], /name="description" content="Specialty coffee in Lahore"/);
  assert.match(out["index.html"], /og:image" content="https:\/\/x.test\/share.jpg"/);
  assert.match(out["index.html"], /wa\.me\/923001234567\?text=Salam/);
  assert.match(out["public/robots.txt"], /Sitemap: https:\/\/noor.example\/sitemap.xml/);
  assert.match(out["public/sitemap.xml"], /<loc>https:\/\/noor.example<\/loc>/);
  assert.ok(!("src/site.json" in out));
});

test("without site settings the export keeps the project name as title, no widget, no sitemap", () => {
  const out = toRepoFiles({ "/App.js": "export default () => null" }, "My Site");
  assert.match(out["index.html"], /<title>My Site<\/title>/);
  assert.doesNotMatch(out["index.html"], /wa\.me/);
  assert.ok(!("public/sitemap.xml" in out));
  assert.match(out["public/robots.txt"], /Allow: \//);
});

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
