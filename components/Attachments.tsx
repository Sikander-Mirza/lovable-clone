"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_IMAGES, fileToDataUrl } from "@/lib/image";

export function useAttachments() {
  const [images, setImages] = useState<string[]>([]);

  const add = useCallback(async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    const urls: string[] = [];
    for (const f of imgs) {
      try {
        urls.push(await fileToDataUrl(f));
      } catch {}
    }
    setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
  }, []);

  const remove = (i: number) => setImages((prev) => prev.filter((_, j) => j !== i));
  const clear = () => setImages([]);

  /** Spread onto a textarea/container so pasted and dropped images are picked up. */
  const handlers = {
    onPaste: (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData.files);
      if (files.some((f) => f.type.startsWith("image/"))) {
        e.preventDefault();
        add(files);
      }
    },
    onDrop: (e: React.DragEvent) => {
      if (e.dataTransfer.files.length) {
        e.preventDefault();
        add(Array.from(e.dataTransfer.files));
      }
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
  };

  return { images, add, remove, clear, handlers };
}

export function AttachButton({ onFiles }: { onFiles: (files: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title="Attach image (or paste / drop)"
        className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
      >
        <ImagePlus size={16} />
      </button>
    </>
  );
}

export function Thumbs({ images, onRemove }: { images: string[]; onRemove: (i: number) => void }) {
  if (!images.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-1 pb-2">
      {images.map((src, i) => (
        <div key={i} className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="attachment" className="h-14 w-14 rounded-lg border border-white/15 object-cover" />
          <button
            onClick={() => onRemove(i)}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-black p-0.5 text-white/80 ring-1 ring-white/30 hover:text-white"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
