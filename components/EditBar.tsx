"use client";

import { useEffect, useRef, useState } from "react";
import { Bold } from "lucide-react";

export type Selection = {
  id: string;
  tag: string;
  text: string | null;
  canText: boolean;
  canClass: boolean;
  color: string;
  bg: string;
  fontSize: number;
  bold: boolean;
};

const SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"];
const RADII = ["none", "sm", "md", "lg", "xl", "2xl", "full"];

type Props = {
  sel: Selection | null;
  notice: string | null;
  onText: (text: string) => void;
  onStyle: (op: string, value: string) => void;
};

export default function EditBar({ sel, notice, onText, onStyle }: Props) {
  const [text, setText] = useState("");
  const [color, setColor] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Re-seed controls whenever the selection (or its computed values) changes.
  useEffect(() => {
    setText(sel?.text ?? "");
    setColor(sel?.color || "#000000");
    setBg(sel?.bg || "#ffffff");
  }, [sel]);

  // Color pickers fire continuously while dragging; debounce source writes.
  const styleDebounced = (op: string, value: string) => {
    clearTimeout(timers.current[op]);
    timers.current[op] = setTimeout(() => onStyle(op, value), 250);
  };

  const box = "rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white outline-none";
  const label = "text-[11px] uppercase tracking-wide text-white/40";

  if (!sel) {
    return (
      <div className="border-b border-white/10 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
        {notice ?? "Edit mode: click an element to select it, double-click text to edit it."}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-violet-500/10 px-3 py-2">
      <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[11px] font-medium">&lt;{sel.tag}&gt;</span>

      {sel.canText && (
        <label className="flex items-center gap-1.5">
          <span className={label}>Text</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => text.trim() && text !== sel.text && onText(text)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className={`${box} w-44`}
          />
        </label>
      )}

      {sel.canClass ? (
        <>
          <label className="flex items-center gap-1.5">
            <span className={label}>Color</span>
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                styleDebounced("textColor", e.target.value);
              }}
              className="h-6 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className={label}>Background</span>
            <input
              type="color"
              value={bg}
              onChange={(e) => {
                setBg(e.target.value);
                styleDebounced("bg", e.target.value);
              }}
              className="h-6 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className={label}>Size</span>
            <select
              defaultValue=""
              key={`s-${sel.id}-${sel.fontSize}`}
              onChange={(e) => onStyle("fontSize", e.target.value)}
              className={box}
            >
              <option value="" disabled>
                {sel.fontSize}px
              </option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => onStyle("fontWeight", sel.bold ? "normal" : "bold")}
            title="Bold"
            className={`rounded-md border px-2 py-1 ${
              sel.bold ? "border-violet-400 bg-violet-600" : "border-white/15 bg-white/5"
            }`}
          >
            <Bold size={13} />
          </button>
          <label className="flex items-center gap-1.5">
            <span className={label}>Corners</span>
            <select
              defaultValue=""
              key={`r-${sel.id}`}
              onChange={(e) => onStyle("radius", e.target.value)}
              className={box}
            >
              <option value="" disabled>
                -
              </option>
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <span className="text-xs text-white/50">Styles for this element come from code. Ask the AI to change them.</span>
      )}

      {notice && <span className="text-xs text-amber-300">{notice}</span>}
    </div>
  );
}
