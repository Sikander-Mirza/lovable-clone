"use client";

import { useEffect, useState } from "react";
import { Eye, Code2 } from "lucide-react";
import { buildPreviewDoc } from "@/lib/previewDoc";

export default function Preview({ files }: { files: Record<string, string> }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [doc, setDoc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const paths = Object.keys(files);
  const current = selected && selected in files ? selected : paths[0];

  // Rebuild the preview document shortly after files stop changing.
  useEffect(() => {
    if (!paths.length) return;
    const t = setTimeout(() => {
      setError(null);
      setDoc(buildPreviewDoc(files));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "preview-error") setError(String(e.data.message));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        {(
          [
            ["preview", Eye, "Preview"],
            ["code", Code2, "Code"],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
              tab === id ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
        {error && tab === "preview" && (
          <span className="ml-auto truncate text-xs text-red-400">Runtime error in preview</span>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        {!paths.length ? (
          <div className="flex h-full items-center justify-center text-white/40">
            Your app will appear here.
          </div>
        ) : (
          <>
            <iframe
              title="Preview"
              srcDoc={doc}
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
              className="h-full w-full border-0 bg-white"
              style={{ display: tab === "preview" ? "block" : "none" }}
            />
            {tab === "code" && (
              <div className="flex h-full">
                <div className="w-56 shrink-0 overflow-y-auto border-r border-white/10 p-2 text-sm">
                  {paths.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelected(p)}
                      className={`block w-full truncate rounded px-2 py-1 text-left ${
                        p === current ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <pre className="min-w-0 flex-1 overflow-auto p-4 text-xs leading-relaxed text-white/80">
                  {current ? files[current] : ""}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
