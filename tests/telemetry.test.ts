import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize, type GenerationLog } from "../lib/telemetry";

const log = (over: Partial<GenerationLog>): GenerationLog => ({
  ts: "2026-01-01T00:00:00Z",
  ok: true,
  provider: "primary",
  model: "gemini",
  firstTokenMs: 2000,
  totalMs: 20000,
  outChars: 10000,
  inChars: 5000,
  hadImages: false,
  attempts: [],
  ...over,
});

test("summary computes success, fallback rate, percentiles and per-model counts", () => {
  const logs = [
    log({ firstTokenMs: 1000, totalMs: 10000 }),
    log({ firstTokenMs: 2000, totalMs: 20000 }),
    log({ firstTokenMs: 3000, totalMs: 30000, attempts: [{ provider: "primary", model: "gemini", status: "503" }] }),
    log({ provider: "backup", model: "cohere", firstTokenMs: 9000, attempts: [{ provider: "primary", model: "gemini", status: "503" }, { provider: "primary", model: "gemini", status: "503" }] }),
    log({ ok: false, provider: undefined, model: undefined, firstTokenMs: undefined, attempts: [{ provider: "primary", model: "gemini", status: "429" }], error: "busy" }),
  ];
  const s = summarize(logs);
  assert.equal(s.total, 5);
  assert.equal(s.okRate, 4 / 5);
  assert.equal(s.fallbackRate, 2 / 4);
  assert.equal(s.byModel["primary/gemini"].n, 3);
  assert.equal(s.byModel["backup/cohere"].n, 1);
  assert.deepEqual(s.topErrors[0], ["503", 3]);
  assert.ok(s.firstTokenP90 >= s.firstTokenP50);
});

test("an empty log summarizes to zeros without crashing", () => {
  const s = summarize([]);
  assert.equal(s.total, 0);
  assert.equal(s.okRate, 0);
  assert.deepEqual(s.byModel, {});
});
