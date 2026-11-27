import { test } from "node:test";
import assert from "node:assert/strict";
import { fixPhotoUrl, fixPhotoUrls } from "../lib/photoUrls";

test("an Unsplash URL that lost its photo- prefix is repaired", () => {
  assert.equal(
    fixPhotoUrl('src="https://images.unsplash.com/1438761681033-6461ffad8d80?auto=format&w=110"'),
    'src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&w=110"'
  );
});

test("correct URLs, other paths and other sites are left alone, and repairing twice changes nothing", () => {
  const ok = [
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1",
    "https://images.unsplash.com/premium_photo-1438761681033-6461ffad8d80",
    "https://images.unsplash.com/profile-1438761681033-abc",
    "https://example.com/1438761681033-6461ffad8d80",
  ].join(" ");
  assert.equal(fixPhotoUrl(ok), ok);
  const once = fixPhotoUrl("images.unsplash.com/1438761681033-6461ffad8d80 images.unsplash.com/1500648767791-00dcc994a43e");
  assert.equal((once.match(/photo-/g) ?? []).length, 2);
  assert.equal(fixPhotoUrl(once), once);
});

test("every file of a project is repaired", () => {
  const out = fixPhotoUrls({ "/a.js": "images.unsplash.com/1438761681033-6461ffad8d80", "/b.js": "nothing" });
  assert.equal(out["/a.js"], "images.unsplash.com/photo-1438761681033-6461ffad8d80");
  assert.equal(out["/b.js"], "nothing");
});
