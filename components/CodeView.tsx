"use client";

import { useState } from "react";
import { Check, Copy, FileCode2 } from "lucide-react";

const size = (n: number) => (n < 1000 ? `${n} chars` : `${(n / 1000).toFixed(1)}k chars`);

/** Read-only source viewer: file list (a dropdown on phones), line numbers and a copy button. */
export default function CodeView({
  files,
  paths,
  current,
  onSelect,
}: {
  files: Record<string, string>;
  paths: string[];
  current: string | undefined;
  onSelect: (path: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const code = current ? files[current] ?? "" : "";
  const lines = code.split("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Phones: a dropdown. Larger screens: a side list. */}
      <select
        value={current ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="File"
        className="field m-2 w-auto md:hidden"
      >
        {paths.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <nav aria-label="Project files" className="hidden w-56 shrink-0 overflow-y-auto border-r border-white/10 p-2 text-sm md:block">
        {paths.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            aria-current={p === current ? "true" : undefined}
            title={p}
            className={`flex w-full items-center gap-1.5 truncate rounded px-2 py-1 text-left ${
              p === current ? "bg-white/10 text-white" : "text-white/65 hover:text-white"
            }`}
          >
            <FileCode2 size={12} className="shrink-0 opacity-60" />
            <span className="truncate">{p}</span>
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-xs text-white/65">
          <span className="truncate font-medium text-white/85">{current}</span>
          <span className="shrink-0">
            {lines.length} lines · {size(code.length)}
          </span>
          <button onClick={copy} disabled={!current} className="btn-ghost ml-auto h-7 px-2.5 text-xs" aria-label="Copy file contents">
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse font-mono text-xs leading-relaxed">
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="hover:bg-white/[.03]">
                  <td className="w-10 select-none pr-3 text-right align-top text-white/40">{i + 1}</td>
                  <td className="whitespace-pre pr-4 text-white/85">{l || " "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
