// Quality harness: runs fixed prompts through the REAL /api/generate pipeline and scores
// the result, so prompt/model/pipeline changes are measured instead of guessed.
//
//   npm run eval                 all prompts
//   npm run eval -- --limit 3    first 3 (each run uses AI quota)
//   npm run eval -- --only coffee,saas
//   EVAL_URL=http://localhost:3000 (default). The dev server must be running.
import fs from "node:fs";
import path from "node:path";
import { parseAssistant } from "../lib/parse";
import { validateProject } from "../lib/validate";
import { PHOTOS } from "../lib/photos";
import { parseTheme, THEME_PATH } from "../lib/theme";

const URL_ = process.env.EVAL_URL || "http://localhost:3000";
const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

type Case = { id: string; prompt: string; details: string };
const all: Case[] = JSON.parse(fs.readFileSync(path.join(__dirname, "../evals/prompts.json"), "utf8"));
const only = opt("only")?.split(",");
const limit = Number(opt("limit")) || all.length;
const cases = all.filter((c) => !only || only.includes(c.id)).slice(0, limit);

const KNOWN_IDS = new Set(Object.values(PHOTOS).flat());

async function generate(c: Case): Promise<{ raw: string; ms: number }> {
  const t0 = Date.now();
  const content = c.details ? `${c.prompt}\n\n${c.details}` : c.prompt;
  const res = await fetch(`${URL_}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content }], files: {} }),
  });
  return { raw: await res.text(), ms: Date.now() - t0 };
}

async function score(c: Case) {
  const { raw, ms } = await generate(c);
  const failed = raw.includes("[error]") && !raw.includes("<file");
  const files = parseAssistant(raw).files;
  if (failed || !Object.keys(files).length) {
    return { id: c.id, score: 0, failed: true, note: raw.slice(0, 120).replace(/\s+/g, " "), seconds: Math.round(ms / 1000) };
  }
  const code = Object.entries(files).filter(([p]) => p !== THEME_PATH).map(([, v]) => v).join("\n");
  const issues = await validateProject(files);
  const errors = issues.filter((i) => i.severity === "error").length;
  const photoIds = [...code.matchAll(/images\.unsplash\.com\/photo-([0-9a-f]+-[0-9a-f]+)/g)].map((m) => m[1]);
  const goodPhotos = photoIds.filter((id) => KNOWN_IDS.has(id)).length;
  const brandUses = (code.match(/\bbrand-\d{2,3}\b/g) ?? []).length;
  const hardcoded = (code.match(/\b(?:bg|text|border|ring|from|to)-(?:indigo|violet|purple)-\d{2,3}\b/g) ?? []).length;
  const components = Object.keys(files).filter((p) => p.startsWith("/components/") || p.startsWith("/pages/")).length;
  const hasTheme = THEME_PATH in files && parseTheme(files).brand !== "";
  // Informational (not scored): did it state a visual direction, and how many of the
  // generic patterns the design directive discourages show up?
  const direction = /direction\s*:/i.test(parseAssistant(raw).text);
  const generic =
    (code.match(/\bbg-gradient-to-/g) ?? []).length +
    (code.match(/\brounded-full\b[^"'`]*\b(?:uppercase|tracking-wide|tracking-widest)\b/g) ?? []).length +
    (code.match(/\bgrid-cols-3\b/g) ?? []).length;

  // 100 points: it compiles (30), is substantial (20), is componentised (15),
  // uses the theme (10 + 5), uses approved photos (10), and has a theme file (10).
  const s =
    (errors === 0 ? 30 : Math.max(0, 30 - errors * 10)) +
    Math.min(code.length / 20000, 1) * 20 +
    Math.min(components / 6, 1) * 15 +
    Math.min(brandUses / 10, 1) * 10 +
    (hardcoded === 0 ? 5 : 0) +
    (photoIds.length ? (goodPhotos / photoIds.length) * Math.min(goodPhotos / 2, 1) * 10 : 0) +
    (hasTheme ? 10 : 0);

  return {
    id: c.id,
    score: Math.round(s),
    failed: false,
    files: Object.keys(files).length,
    chars: code.length,
    errors,
    warns: issues.length - errors,
    brandUses,
    photos: `${goodPhotos}/${photoIds.length}`,
    seconds: Math.round(ms / 1000),
    direction,
    generic,
    note: issues.slice(0, 2).map((i) => i.message.slice(0, 70)).join(" | "),
  };
}

(async () => {
  console.log(`Eval against ${URL_}: ${cases.length} case(s)\n`);
  const results = [];
  for (const c of cases) {
    process.stdout.write(`  ${c.id.padEnd(12)} ... `);
    try {
      const r = await score(c);
      results.push(r);
      console.log(r.failed ? `FAILED (${r.note})` : `score ${r.score}  files ${r.files}  chars ${r.chars}  errors ${r.errors}  direction ${r.direction ? "yes" : "NO"}  generic-patterns ${r.generic}  ${r.seconds}s`);
    } catch (e: any) {
      results.push({ id: c.id, score: 0, failed: true, note: String(e?.message ?? e) });
      console.log(`ERROR ${e?.message ?? e}`);
    }
  }
  const ok = results.filter((r) => !r.failed);
  const avg = results.length ? Math.round(results.reduce((n, r) => n + r.score, 0) / results.length) : 0;
  console.log(`\nAverage score: ${avg}/100  (${ok.length}/${results.length} generated)`);
  const dir = path.join(__dirname, "../evals/results");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), avg, results }, null, 2));
  console.log(`Saved ${path.relative(process.cwd(), file)}`);
})();
