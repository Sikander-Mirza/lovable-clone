"use client";

import { X } from "lucide-react";

/** The same close button in the corner of every toolbar popover (Esc and the backdrop also close it). */
export default function PopoverClose({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} aria-label="Close" title="Close (Esc)" className="icon-btn absolute right-1.5 top-1.5 !m-0 z-10 h-7 w-7">
      <X size={14} />
    </button>
  );
}
