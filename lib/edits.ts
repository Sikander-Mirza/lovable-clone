// Patch-style edits from the model: instead of rewriting a whole file for a small change
// it sends SEARCH/REPLACE blocks. Faster, cheaper, fewer accidental regressions, and the
// UI can show exactly what changed.
//
//   <edit path="/App.js">
//   <<<<<<< SEARCH
//   exact existing text (must appear exactly once)
//   =======
//   replacement
//   >>>>>>> REPLACE
//   </edit>

export type EditBlock = { search: string; replace: string };
export type FileEdit = { path: string; blocks: EditBlock[] };
export type EditFailure = { path: string; reason: string };

const BLOCK = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n?>>>>>>> REPLACE/g;

export function parseBlocks(body: string): EditBlock[] {
  return [...body.matchAll(BLOCK)].map((m) => ({ search: m[1], replace: m[2] }));
}

function countOccurrences(hay: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

/**
 * Fallback when the exact text is not found: compare line by line ignoring indentation and
 * trailing spaces (models often get the whitespace wrong). Returns the character range of the
 * one matching window, or null when there is no match or more than one.
 */
function fuzzyRange(text: string, search: string): [number, number] | null {
  const want = search.split("\n").map((l) => l.trim());
  while (want.length && !want[0]) want.shift();
  while (want.length && !want[want.length - 1]) want.pop();
  if (!want.length) return null;
  const lines = text.split("\n");
  const starts: number[] = [];
  let off = 0;
  for (const l of lines) {
    starts.push(off);
    off += l.length + 1;
  }
  const hits: [number, number][] = [];
  for (let i = 0; i + want.length <= lines.length; i++) {
    if (want.every((w, j) => lines[i + j].trim() === w)) {
      const last = i + want.length - 1;
      hits.push([starts[i], starts[last] + lines[last].length]);
    }
  }
  return hits.length === 1 ? hits[0] : null;
}

/** Applies edits in order. A file whose edit fails is left untouched (all or nothing per file). */
export function applyEdits(
  files: Record<string, string>,
  edits: FileEdit[]
): { files: Record<string, string>; failures: EditFailure[] } {
  const out = { ...files };
  const failures: EditFailure[] = [];

  for (const edit of edits) {
    const original = out[edit.path];
    if (original === undefined) {
      failures.push({ path: edit.path, reason: "the file does not exist (use a <file> block to create it)" });
      continue;
    }
    if (!edit.blocks.length) {
      failures.push({ path: edit.path, reason: "the edit contained no SEARCH/REPLACE block" });
      continue;
    }
    let text = original;
    let failure: string | null = null;
    for (const [i, b] of edit.blocks.entries()) {
      const n = countOccurrences(text, b.search);
      if (n === 0) {
        const r = fuzzyRange(text, b.search);
        if (r) {
          text = text.slice(0, r[0]) + b.replace + text.slice(r[1]);
          continue;
        }
        failure = `block ${i + 1}: SEARCH text was not found (it must match the current file exactly, including whitespace)`;
        break;
      }
      if (n > 1) {
        failure = `block ${i + 1}: SEARCH text appears ${n} times (add surrounding lines so it is unique)`;
        break;
      }
      text = text.replace(b.search, () => b.replace);
    }
    if (failure) failures.push({ path: edit.path, reason: failure });
    else out[edit.path] = text;
  }
  return { files: out, failures };
}
