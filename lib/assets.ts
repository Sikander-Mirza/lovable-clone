// Uploaded images are embedded in source as data URLs, which can be hundreds of KB.
// Sending those to the model on every request would burn tokens, so they are swapped
// for short placeholders on the way out and swapped back in on the way in.

const DATA_URL = /data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]{200,}/g;
const PLACEHOLDER = /data:image\/[a-zA-Z0-9+.-]+;base64,\[omitted:([a-z0-9]+)\]/g;

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + s.length.toString(36);
}

export type AssetTable = Record<string, string>;

export function compactFiles(files: Record<string, string>): {
  files: Record<string, string>;
  table: AssetTable;
} {
  const table: AssetTable = {};
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    out[path] = content.replace(DATA_URL, (m) => {
      const id = hash(m);
      table[id] = m;
      return `data:image/jpeg;base64,[omitted:${id}]`;
    });
  }
  return { files: out, table };
}

export function restoreAssets(content: string, table: AssetTable): string {
  return content.replace(PLACEHOLDER, (m, id: string) => table[id] ?? m);
}

export function restoreAll(files: Record<string, string>, table: AssetTable): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [p, c] of Object.entries(files)) out[p] = restoreAssets(c, table);
  return out;
}
