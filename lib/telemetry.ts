// Generation telemetry: one JSON line per request in .data/generations.jsonl (git-ignored),
// so failures, fallbacks and latency can be measured instead of guessed (`npm run stats`).
// Logging must never break a request: on read-only hosts (serverless) it silently does nothing.
import fs from "node:fs";
import path from "node:path";

export type Attempt = { provider: string; model: string; status: string };

export type GenerationLog = {
  ts: string;
  ok: boolean;
  provider?: string; // who finally answered
  model?: string;
  firstTokenMs?: number;
  totalMs: number;
  outChars: number;
  inChars: number; // size of the context we sent (files + history)
  hadImages: boolean;
  attempts: Attempt[]; // every failed attempt before success (or all of them on failure)
  error?: string;
};

const FILE = path.join(process.cwd(), ".data", "generations.jsonl");

export function logGeneration(entry: GenerationLog): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.appendFileSync(FILE, JSON.stringify(entry) + "\n");
  } catch {
    /* read-only filesystem: ignore */
  }
}

export function readLogs(file = FILE): GenerationLog[] {
  try {
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as GenerationLog);
  } catch {
    return [];
  }
}

const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

export type Summary = {
  total: number;
  okRate: number;
  fallbackRate: number; // successful requests that needed more than the first model
  firstTokenP50: number;
  firstTokenP90: number;
  totalP50: number;
  totalP90: number;
  avgOutChars: number;
  byModel: Record<string, { n: number; ok: number; firstTokenP50: number }>;
  topErrors: [string, number][];
};

export function summarize(logs: GenerationLog[]): Summary {
  const ok = logs.filter((l) => l.ok);
  const byModel: Summary["byModel"] = {};
  for (const l of ok) {
    const k = `${l.provider}/${l.model}`;
    byModel[k] ??= { n: 0, ok: 0, firstTokenP50: 0 };
    byModel[k].n++;
    byModel[k].ok++;
  }
  for (const k of Object.keys(byModel)) {
    byModel[k].firstTokenP50 = pct(
      ok.filter((l) => `${l.provider}/${l.model}` === k && l.firstTokenMs != null).map((l) => l.firstTokenMs!),
      50
    );
  }
  const errs = new Map<string, number>();
  for (const l of logs) for (const a of l.attempts) errs.set(a.status, (errs.get(a.status) ?? 0) + 1);

  return {
    total: logs.length,
    okRate: logs.length ? ok.length / logs.length : 0,
    fallbackRate: ok.length ? ok.filter((l) => l.attempts.length > 0).length / ok.length : 0,
    firstTokenP50: pct(ok.map((l) => l.firstTokenMs ?? 0), 50),
    firstTokenP90: pct(ok.map((l) => l.firstTokenMs ?? 0), 90),
    totalP50: pct(ok.map((l) => l.totalMs), 50),
    totalP90: pct(ok.map((l) => l.totalMs), 90),
    avgOutChars: ok.length ? Math.round(ok.reduce((n, l) => n + l.outChars, 0) / ok.length) : 0,
    byModel,
    topErrors: [...errs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}
