// Summary of .data/generations.jsonl: npm run stats
import { readLogs, summarize } from "../lib/telemetry";

const logs = readLogs();
if (!logs.length) {
  console.log("No generations logged yet (.data/generations.jsonl). Use the app, then run this again.");
  process.exit(0);
}
const s = summarize(logs);
const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

console.log(`Generations: ${s.total}   success: ${(s.okRate * 100).toFixed(0)}%   needed a fallback: ${(s.fallbackRate * 100).toFixed(0)}%`);
console.log(`First token: p50 ${sec(s.firstTokenP50)}  p90 ${sec(s.firstTokenP90)}`);
console.log(`Total time:  p50 ${sec(s.totalP50)}  p90 ${sec(s.totalP90)}   average output ${s.avgOutChars} chars`);
console.log("\nWho answered:");
for (const [k, v] of Object.entries(s.byModel)) console.log(`  ${k.padEnd(48)} ${String(v.n).padStart(4)} requests   first token p50 ${sec(v.firstTokenP50)}`);
if (s.topErrors.length) {
  console.log("\nMost common failed attempts:");
  for (const [e, n] of s.topErrors) console.log(`  ${String(n).padStart(4)}  ${e}`);
}
