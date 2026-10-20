"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import type { ClarifyQuestion } from "@/app/api/clarify/route";

type Answers = Record<number, { picks: string[]; custom: string }>;

/** Turns answered questions into a compact block appended to the prompt. */
export function formatDetails(questions: ClarifyQuestion[], answers: Answers): string {
  const lines: string[] = [];
  questions.forEach((q, i) => {
    const a = answers[i];
    if (!a) return;
    const parts = [...a.picks, a.custom.trim()].filter(Boolean);
    if (parts.length) lines.push(`- ${q.question} ${parts.join("; ")}`);
  });
  return lines.length ? `Details from the user:\n${lines.join("\n")}` : "";
}

export default function ClarifyDialog({
  prompt,
  hasImage,
  onBuild,
  onCancel,
}: {
  prompt: string;
  hasImage: boolean;
  /** `details` is empty when the user skipped or answered nothing. */
  onBuild: (details: string) => void;
  onCancel: () => void;
}) {
  const [questions, setQuestions] = useState<ClarifyQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Answers>({});

  useEffect(() => {
    let alive = true;
    fetch("/api/clarify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, hasImage }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const qs: ClarifyQuestion[] = d.questions ?? [];
        // Nothing useful to ask: build straight away.
        if (!qs.length) onBuild("");
        else setQuestions(qs);
      })
      .catch(() => alive && onBuild(""));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (qi: number, option: string, multi: boolean) =>
    setAnswers((prev) => {
      const cur = prev[qi] ?? { picks: [], custom: "" };
      const has = cur.picks.includes(option);
      const picks = multi ? (has ? cur.picks.filter((p) => p !== option) : [...cur.picks, option]) : has ? [] : [option];
      return { ...prev, [qi]: { ...cur, picks } };
    });

  const setCustom = (qi: number, custom: string) =>
    setAnswers((prev) => ({ ...prev, [qi]: { picks: prev[qi]?.picks ?? [], custom } }));

  const answered = Object.values(answers).filter((a) => a.picks.length || a.custom.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-[#14141c]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles size={17} className="text-violet-400" /> A few quick questions
            </h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-white/45">&ldquo;{prompt}&rdquo;</p>
          </div>
          <button onClick={onCancel} className="text-white/40 hover:text-white" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {!questions && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Loader2 size={15} className="animate-spin" /> Thinking of the right questions...
            </div>
          )}
          {questions?.map((q, qi) => (
            <div key={qi}>
              <p className="text-sm font-medium">
                {qi + 1}. {q.question}
                {q.multi && <span className="ml-2 text-[11px] font-normal text-white/35">pick any</span>}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const on = answers[qi]?.picks.includes(o);
                  return (
                    <button
                      key={o}
                      onClick={() => toggle(qi, o, q.multi)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        on
                          ? "border-violet-400 bg-violet-600 text-white"
                          : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              <input
                value={answers[qi]?.custom ?? ""}
                onChange={(e) => setCustom(qi, e.target.value)}
                placeholder="Or type your own answer..."
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs outline-none placeholder:text-white/25 focus:border-white/30"
              />
            </div>
          ))}
        </div>

        {questions && (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
            <button onClick={() => onBuild("")} className="text-sm text-white/50 hover:text-white">
              Skip, just build it
            </button>
            <button
              onClick={() => onBuild(formatDetails(questions, answers))}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium hover:bg-violet-500"
            >
              {answered ? `Build with ${answered} answer${answered > 1 ? "s" : ""}` : "Build it"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
