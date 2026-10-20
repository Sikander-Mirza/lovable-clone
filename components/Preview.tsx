"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Code2, Wrench } from "lucide-react";
import { buildPreviewDoc } from "@/lib/previewDoc";

const MAX_APP_DATA = 1_000_000; // chars of persisted app data per project

const appDataKey = (id: string) => `lovable-clone:appdata:${id}`;

function readAppData(id: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(appDataKey(id)) || "{}");
  } catch {
    return {};
  }
}

export default function Preview({
  files,
  projectId,
  onFix,
}: {
  files: Record<string, string>;
  projectId: string;
  /** Called with the runtime error text when the user clicks "Fix with AI". */
  onFix?: (error: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
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
      setDoc(buildPreviewDoc(files, readAppData(projectId)));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // Only trust messages from our own preview iframe.
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === "preview-error") setError(String(e.data.message));
      if (e.data?.type === "storage-sync" && e.data.data && typeof e.data.data === "object") {
        const json = JSON.stringify(e.data.data);
        if (json.length > MAX_APP_DATA) return;
        try {
          localStorage.setItem(appDataKey(projectId), json);
        } catch {}
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [projectId]);

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
        {error && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-red-400">Error in preview</span>
            {onFix && (
              <button
                onClick={() => {
                  onFix(error.slice(0, 1500));
                  setError(null);
                }}
                className="flex items-center gap-1.5 rounded-md bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30"
              >
                <Wrench size={12} /> Fix with AI
              </button>
            )}
          </div>
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
              ref={frame}
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
