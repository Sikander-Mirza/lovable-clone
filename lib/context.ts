// Chooses which project files are sent to the model with a request. Small and medium
// projects go in whole. For very large ones, sending everything is slow and expensive, so
// we send the entry file, the theme, the files the request is about, and a one-line
// index of the rest.

export const CONTEXT_BUDGET = 60_000; // characters (~15k tokens)

const ALWAYS = ["/App.js", "/theme.json"];

// Requests that touch the whole site: show as many files as fit, smallest first.
const GLOBAL = /\b(all|whole|entire|every|everything|overall|site-?wide|across|mobile|responsive|design|polish|restyle|redesign|theme|colou?rs?|fonts?|spacing|accessib)/i;

const words = (s: string) =>
  Array.from(new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3)));

export type ContextSelection = {
  shown: string[];
  omitted: { path: string; chars: number }[];
};

export function selectContext(
  files: Record<string, string>,
  request: string,
  budget = CONTEXT_BUDGET
): ContextSelection {
  const paths = Object.keys(files);
  const total = paths.reduce((n, p) => n + files[p].length, 0);
  if (total <= budget) return { shown: paths, omitted: [] };

  const req = request.toLowerCase();
  const tokens = words(request);
  const isGlobal = GLOBAL.test(request);

  const score = (p: string): number => {
    const base = (p.split("/").pop() ?? p).replace(/\.[a-z]+$/, "").toLowerCase();
    let s = 0;
    if (req.includes(p.toLowerCase())) s += 1000; // the request names the exact path
    if (base.length >= 3 && req.includes(base)) s += 200; // ...or the component name
    for (const t of tokens) {
      if (base.includes(t) || t.includes(base)) s += 10;
      const hits = files[p].toLowerCase().split(t).length - 1;
      s += Math.min(hits, 5);
    }
    return s;
  };

  const rest = paths.filter((p) => !ALWAYS.includes(p));
  const order = isGlobal
    ? rest.sort((a, b) => files[a].length - files[b].length) // smallest first = most files fit
    : rest.sort((a, b) => score(b) - score(a) || files[a].length - files[b].length);

  const shown: string[] = [];
  let used = 0;
  for (const p of [...ALWAYS.filter((p) => p in files), ...order]) {
    const size = files[p].length;
    const mandatory = ALWAYS.includes(p);
    if (mandatory || used + size <= budget) {
      shown.push(p);
      used += size;
    }
  }
  const omitted = paths.filter((p) => !shown.includes(p)).map((p) => ({ path: p, chars: files[p].length }));
  return { shown: paths.filter((p) => shown.includes(p)), omitted };
}
