"use client";

import PopoverClose from "./PopoverClose";
import { useEscape } from "@/lib/useEscape";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, LayoutList, Plus, Sparkles, Trash2 } from "lucide-react";
import { LIBRARY, insertSection, listSections, moveSection, regeneratePrompt, removeSection, toggleSection } from "@/lib/sections";

const human = (n: string) => n.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

/** "Sections" popover: reorder, hide, remove and add ready-made sections without the AI. */
export default function SectionsPanel({
  files,
  onFilesChange,
  onAskAI,
}: {
  files: Record<string, string>;
  onFilesChange: (files: Record<string, string>) => void;
  onAskAI?: (prompt: string) => void;
}) {
  const [regen, setRegen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const app = files["/App.js"] ?? "";
  const sections = listSections(app);
  const existing = new Set(sections.map((s) => s.name));
  const setApp = (next: string) => next !== app && onFilesChange({ ...files, "/App.js": next });

  const remove = (name: string) => {
    const next: Record<string, string> = { ...files, "/App.js": removeSection(app, name) };
    delete next[`/components/${name}.js`];
    onFilesChange(next);
  };

  const add = (name: string, code: string) => {
    // Right after the last visible section so it lands before the footer.
    const after = sections.filter((s) => !s.hidden).at(-1)?.name;
    onFilesChange({ ...files, [`/components/${name}.js`]: code, "/App.js": insertSection(app, name, after) });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          const r = ref.current?.getBoundingClientRect();
          if (r) setAlignRight(r.left + 320 > window.innerWidth - 12);
          setOpen((v) => !v);
        }}
        title="Reorder, hide and add sections"
        className="tool-btn"
        data-open={open}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Sections: reorder, hide and add"
      >
        <LayoutList size={14} /> <span className="tool-label">Sections</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Page sections"
            className={`popover absolute top-full z-50 mt-2 max-h-[75vh] w-[320px] max-w-[calc(100vw-24px)] overflow-y-auto p-3 ${
              alignRight ? "right-0" : "left-0"
            }`}
          >
            <div className="mb-2 px-1 text-xs font-medium text-white/80">Page sections</div>
            {sections.length === 0 ? (
              <p className="px-1 pb-2 text-xs leading-snug text-white/60">
                No sections found in /App.js. This panel works with single-page sites where App.js lists one section per line.
              </p>
            ) : (
              <ol className="space-y-1">
                {sections.map((s, i) => (
                  <li
                    key={s.name}
                    className={`rounded-lg border px-2 py-1 ${
                      s.hidden ? "border-white/5 opacity-50" : "border-white/10 bg-white/[.03]"
                    }`}
                  >
                   <div className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate text-xs">{human(s.name)}</span>
                    {onAskAI && (
                      <button
                        onClick={() => {
                          setRegen(regen === s.name ? null : s.name);
                          setNote("");
                        }}
                        className={`icon-btn h-6 w-6 ${regen === s.name ? "text-violet-300" : ""}`}
                        title="Redesign this section with AI"
                      >
                        <Sparkles size={12} />
                      </button>
                    )}
                    <button onClick={() => setApp(moveSection(app, s.name, -1))} disabled={i === 0} className="icon-btn h-6 w-6" title="Move up">
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => setApp(moveSection(app, s.name, 1))}
                      disabled={i === sections.length - 1}
                      className="icon-btn h-6 w-6"
                      title="Move down"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button onClick={() => setApp(toggleSection(app, s.name))} className="icon-btn h-6 w-6" title={s.hidden ? "Show" : "Hide"}>
                      {s.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={() => confirm(`Remove "${human(s.name)}" and its file?`) && remove(s.name)}
                      className="icon-btn h-6 w-6 hover:text-red-400"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                   </div>
                   {regen === s.name && onAskAI && (
                    <form
                      className="mt-1.5 flex gap-1 pb-0.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setOpen(false);
                        setRegen(null);
                        onAskAI(regeneratePrompt(s.name, note));
                      }}
                    >
                      <input
                        autoFocus
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What to change? (optional)"
                        className="field h-7 min-w-0 flex-1 text-xs"
                      />
                      <button type="submit" className="btn-primary h-7 px-2 text-xs">
                        Redesign
                      </button>
                    </form>
                   )}
                  </li>
                ))}
              </ol>
            )}

            <div className="mb-1.5 mt-3 px-1 text-xs font-medium text-white/80">Add from the library</div>
            <div className="grid grid-cols-2 gap-1.5">
              {LIBRARY.map((item) => {
                const has = existing.has(item.name);
                return (
                  <button
                    key={item.name}
                    onClick={() => add(item.name, item.code)}
                    disabled={has || !app}
                    title={has ? "Already on the page" : item.description}
                    className="flex flex-col items-start gap-0.5 rounded-lg border border-white/10 bg-white/[.03] p-2 text-left text-xs transition hover:border-violet-400/50 hover:bg-white/[.06] disabled:opacity-40"
                  >
                    <span className="flex items-center gap-1 font-medium">
                      <Plus size={11} /> {item.label}
                    </span>
                    <span className="text-[10.5px] leading-tight text-white/60">{item.description}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 px-1 text-xs leading-snug text-white/60">
              Library sections use your brand color and can be edited with the Edit tool or the chat.
            </p>
            <PopoverClose onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
