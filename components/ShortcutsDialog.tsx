"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { useEscape } from "@/lib/useEscape";

const SHORTCUTS: [string, string][] = [
  ["Enter", "Send the message"],
  ["Shift + Enter", "New line in the message"],
  ["Ctrl + Z", "Undo the last change"],
  ["Ctrl + Shift + Z", "Redo"],
  ["Esc", "Close a panel or leave full preview"],
  ["?", "Show this list"],
];

const typing = (el: Element | null) =>
  !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable);

/** Header button plus the "?" key: a short list of keyboard shortcuts. */
export default function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !typing(document.activeElement)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
        className="icon-btn hidden md:inline-flex"
      >
        <Keyboard size={16} />
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="w-full max-w-sm modal p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Keyboard size={18} /> Keyboard shortcuts
            </h2>
            <dl className="space-y-2">
              {SHORTCUTS.map(([keys, what]) => (
                <div key={keys} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-white/75">{what}</dt>
                  <dd>
                    <kbd className="rounded-md border border-white/15 bg-white/[.06] px-2 py-0.5 text-xs text-white">{keys}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setOpen(false)} className="btn-ghost h-8 px-3 text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
