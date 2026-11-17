"use client";

import PopoverClose from "./PopoverClose";
import { useEscape } from "@/lib/useEscape";

import { useEffect, useRef, useState } from "react";
import { Moon, Palette } from "lucide-react";
import { BRAND_PRESETS, DARK_MODE_PROMPT, FONTS, parseTheme, type Theme } from "@/lib/theme";

/** Toolbar button + popover to restyle the whole site: brand color and fonts. */
export default function ThemePanel({
  files,
  onChange,
  onAskAI,
}: {
  files: Record<string, string>;
  onChange: (theme: Theme) => void;
  onAskAI?: (prompt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));
  const current = parseTheme(files);
  const [draft, setDraft] = useState<Theme>(current);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Re-seed when the project's theme changes from outside (undo, AI, restore).
  useEffect(() => {
    setDraft(parseTheme(files));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files["/theme.json"]]);

  // Every change rewrites /theme.json and reloads the preview, so wait for the user to settle.
  const update = (patch: Partial<Theme>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 350);
  };

  const field = "rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Theme: brand color and fonts for the whole site"
        className="tool-btn"
        data-open={open}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Theme: brand color and fonts"
      >
        <Palette size={14} /> <span className="tool-label">Theme</span>
        <span className="h-3 w-3 rounded-full border border-white/30" style={{ background: current.brand }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Theme" className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-24px)] space-y-4 popover p-4 shadow-2xl">
            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-white/60">Brand color</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {BRAND_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ brand: c })}
                    title={c}
                    aria-label={`Brand color ${c}`}
                    className={`h-6 w-6 rounded-full border-2 ${
                      draft.brand === c ? "border-white" : "border-transparent hover:border-white/40"
                    }`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={draft.brand}
                  onChange={(e) => update({ brand: e.target.value })}
                  className="h-6 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">Body font</span>
              <select value={draft.font} onChange={(e) => update({ font: e.target.value })} className={`${field} w-full`}>
                {FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">Heading font</span>
              <select
                value={draft.headingFont}
                onChange={(e) => update({ headingFont: e.target.value })}
                className={`${field} w-full`}
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            {onAskAI && Object.keys(files).length > 0 && (
              <button
                onClick={() => {
                  setOpen(false);
                  onAskAI(DARK_MODE_PROMPT);
                }}
                className="btn h-8 w-full border border-white/10 text-xs"
                title="The AI adds a sun/moon switch and a dark look to every section"
              >
                <Moon size={13} /> Add a light/dark switch
              </button>
            )}

            <p className="text-xs leading-snug text-white/60">
              Applies to the whole site. Works on parts that use the brand color and default fonts; elements
              with a fixed color keep it (change those with Edit).
            </p>
            <PopoverClose onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
