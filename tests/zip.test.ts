import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { createZip } from "../lib/zip";

test("zip has valid structure and CRCs (stored entries, UTF-8 names)", async () => {
  const files = { "/src/App.js": "export default 1; // ✓ دنیا", "readme.md": "hello" };
  const buf = Buffer.from(await createZip(files).arrayBuffer());
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd > 0);
  assert.equal(buf.readUInt16LE(eocd + 10), 2); // total entries
  let off = buf.readUInt32LE(eocd + 16); // central directory offset
  const seen: Record<string, string> = {};
  for (let i = 0; i < 2; i++) {
    assert.equal(buf.readUInt32LE(off), 0x02014b50);
    const crc = buf.readUInt32LE(off + 16);
    const size = buf.readUInt32LE(off + 24);
    const nameLen = buf.readUInt16LE(off + 28);
    const local = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(dataStart, dataStart + size);
    assert.equal(zlib.crc32(data), crc, `crc of ${name}`);
    seen[name] = data.toString("utf8");
    off += 46 + nameLen;
  }
  assert.equal(seen["src/App.js"], files["/src/App.js"]); // leading slash stripped
  assert.equal(seen["readme.md"], "hello");
});
