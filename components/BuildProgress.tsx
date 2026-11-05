"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { parseAssistant } from "@/lib/parse";

export type BuildMode = "build" | "update" | "expand" | "fix";

const TITLES: Record<BuildMode, string> = {
  build: "Building your site",
  update: "Updating your site",
  expand: "Expanding your site",
  fix: "Fixing an error",
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Live view of what the AI is doing: stages, the file being written, and a code ticker. */
export default function BuildProgress({ raw, mode }: { raw: string; mode: BuildMode }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const { files, edits, openPath, openEditPath, text } = parseAssistant(raw);
  const done = Object.keys(files).filter((p) => p !== openPath).length + edits.length;
  const current = openPath ?? openEditPath;
  const started = raw.length > 0;
  const hasDirection = /direction\s*:/i.test(text) || done > 0 || !!current;
  const writing = !!current || done > 0;

  // The tail of the file being written: a few lines that scroll by like a terminal.
  const tail = openPath
    ? (files[openPath] ?? "").split("\n").slice(-4).map((l) => l.slice(0, 64))
    : [];

  const stages = [
    { label: "Understanding your request", done: started, active: !started },
    { label: "Choosing a visual direction", done: hasDirection && writing, active: started && !writing },
    {
      label: current ? `Writing ${current}` : "Writing the code",
      done: false,
      active: writing,
      extra: done ? `${done} file${done === 1 ? "" : "s"} done` : "",
    },
  ];

  return (
    <div className="rise overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-b from-violet-500/[.08] to-transparent p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="orb flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Sparkles size={14} className="text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{TITLES[mode]}</div>
          <div className="text-[11px] text-white/40">
            {fmt(secs)} · {raw.length > 999 ? `${(raw.length / 1000).toFixed(1)}k` : raw.length} characters generated
          </div>
        </div>
      </div>

      <div className="progress-indeterminate mt-3" />

      <ul className="mt-3 space-y-1.5">
        {stages.map((s) => (
          <li
            key={s.label}
            className={`flex items-center gap-2 text-xs transition ${
              s.done ? "text-white/45" : s.active ? "text-white" : "text-white/25"
            }`}
          >
            {s.done ? (
              <Check size={12} className="text-emerald-400" />
            ) : s.active ? (
              <Loader2 size={12} className="animate-spin text-violet-300" />
            ) : (
              <span className="h-3 w-3 rounded-full border border-white/20" />
            )}
            <span className="truncate">{s.label}</span>
            {s.extra && <span className="ml-auto shrink-0 text-white/35">{s.extra}</span>}
          </li>
        ))}
      </ul>

      {tail.length > 0 && (
        <pre className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/40 p-2.5 font-mono text-[10.5px] leading-relaxed text-violet-200/80">
          {tail.map((l, i) => (
            <div key={i} className={`truncate ${i === tail.length - 1 ? "caret" : ""}`}>
              {l || " "}
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}
