"use client";

import { useEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Trash2, Upload } from "lucide-react";
import { fileToDataUrl } from "@/lib/image";

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
  align: string;
  isImg: boolean;
  canSrc: boolean;
  canDelete: boolean;
  src: string | null;
};

const SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"];
const RADII = ["none", "sm", "md", "lg", "xl", "2xl", "full"];
const SPACING = ["0", "1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24"];
const ALIGNS: [string, typeof AlignLeft][] = [
  ["left", AlignLeft],
  ["center", AlignCenter],
  ["right", AlignRight],
];

type Props = {
  sel: Selection | null;
  notice: string | null;
  onText: (text: string) => void;
  onStyle: (op: string, value: string) => void;
  onImage: (src: string) => void;
  onDelete: () => void;
};

export default function EditBar({ sel, notice, onText, onStyle, onImage, onDelete }: Props) {
  const [text, setText] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [color, setColor] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Re-seed controls whenever the selection (or its computed values) changes.
  useEffect(() => {
    setText(sel?.text ?? "");
    setImgUrl(sel?.src?.startsWith("data:") ? "" : (sel?.src ?? ""));
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

      {sel.isImg && sel.canSrc && (
        <div className="flex items-center gap-1.5">
          <span className={label}>Image</span>
          <input
            value={imgUrl}
            onChange={(e) => setImgUrl(e.target.value)}
            onBlur={() => imgUrl.trim() && imgUrl !== sel.src && onImage(imgUrl.trim())}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="https://... or upload"
            className={`${box} w-48`}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onImage(await fileToDataUrl(f, 800));
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
          >
            <Upload size={12} /> Upload
          </button>
        </div>
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
          <label className="flex items-center gap-1.5">
            <span className={label}>Padding</span>
            <select
              defaultValue=""
              key={`p-${sel.id}`}
              onChange={(e) => onStyle("padding", e.target.value)}
              className={box}
            >
              <option value="" disabled>
                -
              </option>
              {SPACING.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className={label}>Margin</span>
            <select
              defaultValue=""
              key={`m-${sel.id}`}
              onChange={(e) => onStyle("margin", e.target.value)}
              className={box}
            >
              <option value="" disabled>
                -
              </option>
              {SPACING.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            {ALIGNS.map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => onStyle("textAlign", v)}
                title={`Align ${v}`}
                className={`rounded-md border px-1.5 py-1 ${
                  sel.align === v ? "border-violet-400 bg-violet-600" : "border-white/15 bg-white/5"
                }`}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <span className="text-xs text-white/50">Styles for this element come from code. Ask the AI to change them.</span>
      )}

      {sel.canDelete && (
        <button
          onClick={onDelete}
          title="Delete this element"
          className="ml-auto flex items-center gap-1 rounded-md border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
        >
          <Trash2 size={12} /> Delete
        </button>
      )}

      {notice && <span className="text-xs text-amber-300">{notice}</span>}
    </div>
  );
}
