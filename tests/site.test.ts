import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SITE, parseSite, seoTags, serializeSite, whatsappHref, whatsappWidget } from "../lib/site";

test("missing or broken site.json gives safe defaults", () => {
  assert.deepEqual(parseSite({}), DEFAULT_SITE);
  assert.deepEqual(parseSite({ "/site.json": "nope" }), DEFAULT_SITE);
});

test("settings are sanitized: bad urls dropped, number reduced to digits, lang validated", () => {
  const s = parseSite({
    "/site.json": JSON.stringify({
      seo: { title: "  Noor Coffee  ", image: "javascript:alert(1)", url: "https://noor.example/", lang: "<x>" },
      whatsapp: { enabled: true, number: "+92 300-123 4567", message: "" },
    }),
  });
  assert.equal(s.seo.title, "Noor Coffee");
  assert.equal(s.seo.image, "");
  assert.equal(s.seo.url, "https://noor.example/");
  assert.equal(s.seo.lang, "en");
  assert.equal(s.whatsapp.number, "923001234567");
  assert.ok(s.whatsapp.message.length > 0);
});

test("seo tags escape content and include og/twitter tags", () => {
  const html = seoTags({ title: 'Cafe "Noor" <b>', description: "Best & freshest", image: "https://x.test/a.jpg", url: "https://x.test/", lang: "en" }, "Fallback");
  assert.match(html, /<title>Cafe &quot;Noor&quot; &lt;b&gt;<\/title>/);
  assert.match(html, /name="description" content="Best &amp; freshest"/);
  assert.match(html, /og:image" content="https:\/\/x.test\/a.jpg"/);
  assert.match(html, /summary_large_image/);
  assert.ok(!html.includes("<b>"));
  assert.match(seoTags({ ...DEFAULT_SITE.seo }, "Fallback"), /<title>Fallback<\/title>/);
});

test("the WhatsApp widget only renders when enabled with a plausible number", () => {
  const on = { enabled: true, number: "923001234567", message: "Hi there & welcome" };
  assert.match(whatsappHref(on), /^https:\/\/wa\.me\/923001234567\?text=Hi%20there%20%26%20welcome$/);
  assert.match(whatsappWidget(on), /wa\.me\/923001234567/);
  assert.equal(whatsappWidget({ ...on, enabled: false }), "");
  assert.equal(whatsappWidget({ ...on, number: "123" }), "");
});

test("serialize round-trips through parse", () => {
  const s = { ...DEFAULT_SITE, seo: { ...DEFAULT_SITE.seo, title: "T", lang: "ur" } };
  assert.deepEqual(parseSite({ "/site.json": serializeSite(s) }), s);
});
