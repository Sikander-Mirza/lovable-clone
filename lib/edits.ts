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
