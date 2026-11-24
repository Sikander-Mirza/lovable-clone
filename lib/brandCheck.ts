// The theme gives every site a `brand` color scale (brand-50 ... brand-950), and the prompt says
// to use it for all accents. Models still reach for Tailwind's default indigo/violet/blue, so a
// "monochrome" site ends up with a navy hero. This finds those hardcoded accents so one automatic
// pass can swap them for brand-* (same shade numbers).

const ACCENT =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|decoration|accent|caret|shadow)-(?:indigo|violet|purple|fuchsia|blue)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g;

/** A few stray text or border hits are left alone (one blue link is not a design problem)... */
export const BRAND_CHECK_MIN = 3;
/** ...but a hardcoded background or gradient is loud (a whole CTA band), so one is enough. */
const FILL = /^(?:bg|from|to|via)-/;

export type BrandProblems = { total: number; files: { file: string; count: number; examples: string[] }[] };

const isCode = (path: string) => /^\/(App|components\/.+|pages\/.+)\.jsx?$/.test(path);

export function brandCheck(files: Record<string, string>): BrandProblems | null {
  const found: BrandProblems["files"] = [];
  let total = 0;
  let fills = 0;
  for (const [file, src] of Object.entries(files)) {
    if (!isCode(file)) continue;
    const hits = src.match(ACCENT) ?? [];
    if (!hits.length) continue;
    total += hits.length;
    fills += hits.filter((h) => FILL.test(h.slice(h.lastIndexOf(":") + 1))).length;
    found.push({ file, count: hits.length, examples: Array.from(new Set(hits)).slice(0, 4) });
  }
  return total >= BRAND_CHECK_MIN || fills > 0 ? { total, files: found.sort((a, b) => b.count - a.count) } : null;
}

export function brandFixPrompt(p: BrandProblems): string {
  const list = p.files.slice(0, 12).map((f) => `- ${f.file}: ${f.count} (for example ${f.examples.join(", ")})`).join("\n");
  return (
    "The site hardcodes Tailwind's default accent colors (indigo, violet, purple, fuchsia, blue) instead of the theme's brand color, so it does not match the chosen palette:\n" +
    list +
    "\n\nReplace each of these with the matching brand-* class using the same shade number (bg-indigo-600 becomes bg-brand-600, text-blue-700 becomes text-brand-700, from-violet-500 becomes from-brand-500, hover: and focus: variants too). " +
    "Use small <edit> blocks. Leave neutral grays alone, and leave a color that is clearly a deliberate non-brand color (for example a star rating or a status badge). Change nothing else."
  );
}
