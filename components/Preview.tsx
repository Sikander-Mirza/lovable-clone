"use client";

import { useEffect, useRef, useState } from "react";
import {
  Code2,
  Eye,
  Inbox,
  Monitor,
  Pencil,
  Redo2,
  RefreshCw,
  Smartphone,
  Tablet,
  Undo2,
  Wrench,
} from "lucide-react";
import { buildPreviewDoc } from "@/lib/previewDoc";
import { sameFiles } from "@/lib/versions";
import EditBar, { type Selection } from "./EditBar";
import ThemePanel from "./ThemePanel";
import SubmissionsPanel from "./SubmissionsPanel";
import { addSubmission } from "@/lib/submissions";
import type { Theme } from "@/lib/theme";

const DEVICES = {
  desktop: { label: "Desktop", width: "100%", Icon: Monitor },
  tablet: { label: "Tablet (768px)", width: "768px", Icon: Tablet },
  mobile: { label: "Mobile (390px)", width: "390px", Icon: Smartphone },
} as const;

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
  onSourceEdit,
  onRuntimeError,
  onThemeChange,
  editDisabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  files: Record<string, string>;
  projectId: string;
  /** Called with the runtime error text when the user clicks "Fix with AI". */
  onFix?: (error: string) => void;
  /** Called when a visual edit changed a source file. */
  onSourceEdit?: (path: string, source: string) => void;
  /** Called whenever the running preview reports an error (used for the automatic fix loop). */
  onRuntimeError?: (error: string) => void;
  /** Called when the user changes the site theme (brand color / fonts). */
  onThemeChange?: (theme: Theme) => void;
  editDisabled?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [nonce, setNonce] = useState(0);
  const [subTick, setSubTick] = useState(0); // bumps when a form submission arrives
  const onRuntimeErrorRef = useRef(onRuntimeError);
  onRuntimeErrorRef.current = onRuntimeError;
  const undoRef = useRef(onUndo);
  const redoRef = useRef(onRedo);
  undoRef.current = onUndo;
  redoRef.current = onRedo;
  const [tab, setTab] = useState<"preview" | "code" | "data">("preview");
  const [doc, setDoc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [sel, setSel] = useState<Selection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const paths = Object.keys(files);
  const current = selected && selected in files ? selected : paths[0];

  // What the iframe currently has, so visual edits (already applied in the DOM)
  // don't trigger a reload when they flow back in through `files`.
  const built = useRef<Record<string, string> | null>(null);
  const editModeRef = useRef(false);
  const pendingSelect = useRef<string | null>(null);
  const onSourceEditRef = useRef(onSourceEdit);
  onSourceEditRef.current = onSourceEdit;
  editModeRef.current = editMode && !editDisabled;

  const post = (msg: object) => frame.current?.contentWindow?.postMessage(msg, "*");

  // Rebuild the preview document shortly after files stop changing.
  useEffect(() => {
    if (!paths.length) return;
    if (built.current && sameFiles(files, built.current)) return;
    const t = setTimeout(() => {
      built.current = files;
      setError(null);
      setSel(null);
      setDoc(buildPreviewDoc(files, readAppData(projectId)));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    post({ type: "mode", on: editMode && !editDisabled });
    if (!editMode || editDisabled) setSel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, editDisabled]);

  // Ctrl/Cmd+Z and Ctrl+Shift+Z / Ctrl+Y when focus is on the page (not in a text field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" || k === "y") {
        e.preventDefault();
        (k === "y" || e.shiftKey ? redoRef : undoRef).current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // Only trust messages from our own preview iframe.
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data;
      if (d?.type === "preview-ready") {
        post({ type: "mode", on: editModeRef.current });
        // After an insert, the preview reloads; re-select the element that was just added.
        if (pendingSelect.current) {
          post({ type: "selectId", id: pendingSelect.current });
          pendingSelect.current = null;
        }
      }
      if (d?.type === "select") setSel(d.id ? (d as Selection) : null);
      if (d?.type === "edit-error") setNotice(String(d.message));
      if (d?.type === "form-submit" && typeof d.name === "string") {
        const payload = d.data && typeof d.data === "object" ? d.data : {};
        if (JSON.stringify(payload).length > 10_000) {
          post({ type: "submit-result", id: d.id, ok: false });
        } else {
          addSubmission(projectId, d.name.slice(0, 40) || "form", payload as Record<string, unknown>)
            .then((ok) => post({ type: "submit-result", id: d.id, ok }))
            .then(() => setSubTick((n) => n + 1));
        }
      }
      if (d?.type === "shortcut") (d.name === "redo" ? redoRef : undoRef).current?.();
      if (d?.type === "source-update" && typeof d.path === "string" && typeof d.source === "string") {
        if (typeof d.selectId === "string") pendingSelect.current = d.selectId;
        // `reload` edits (e.g. delete) shift element ids, so let the preview rebuild.
        if (!d.reload) built.current = { ...(built.current ?? {}), [d.path]: d.source };
        onSourceEditRef.current?.(d.path, d.source);
      }
      if (e.data?.type === "preview-error") {
        setError(String(e.data.message));
        onRuntimeErrorRef.current?.(String(e.data.message));
      }
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
            ["data", Inbox, "Data"],
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
        {tab === "preview" && paths.length > 0 && (
          <button
            onClick={() => setEditMode((v) => !v)}
            disabled={editDisabled}
            title={editDisabled ? "Wait for the AI to finish" : "Edit the page visually"}
            className={`ml-2 flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 ${
              editMode && !editDisabled
                ? "border-violet-400 bg-violet-600 text-white"
                : "border-white/15 text-white/60 hover:text-white"
            }`}
          >
            <Pencil size={13} /> Edit
          </button>
        )}
        {tab === "preview" && paths.length > 0 && onThemeChange && (
          <div className="ml-2">
            <ThemePanel files={files} onChange={onThemeChange} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <Redo2 size={15} />
          </button>
          {tab === "preview" && (
            <>
              <span className="mx-1 h-4 w-px bg-white/15" />
              {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((k) => {
                const { Icon, label } = DEVICES[k];
                return (
                  <button
                    key={k}
                    onClick={() => setDevice(k)}
                    title={label}
                    className={`rounded-md p-1.5 ${
                      device === k ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                    }`}
                  >
                    <Icon size={15} />
                  </button>
                );
              })}
              <button
                onClick={() => setNonce((n) => n + 1)}
                title="Reload preview"
                className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <RefreshCw size={14} />
              </button>
            </>
          )}
        </div>
        {error && (
          <div className="ml-3 flex items-center gap-2">
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

      {editMode && !editDisabled && tab === "preview" && paths.length > 0 && (
        <EditBar
          sel={sel}
          notice={notice}
          onText={(text) => post({ type: "setText", text })}
          onStyle={(op, value) => post({ type: "style", op, value })}
          onImage={(src) => post({ type: "setSrc", src })}
          onDelete={() => post({ type: "delete" })}
          onDuplicate={() => post({ type: "duplicate" })}
          onInsert={(kind, where) => post({ type: "insert", kind, where })}
        />
      )}

      <div className="relative min-h-0 flex-1">
        {!paths.length ? (
          <div className="flex h-full items-center justify-center text-white/40">
            Your app will appear here.
          </div>
        ) : (
          <>
            <div
              className="flex h-full justify-center overflow-auto bg-neutral-900"
              style={{ display: tab === "preview" ? "flex" : "none" }}
            >
              <iframe
                ref={frame}
                title="Preview"
                srcDoc={nonce ? `${doc}<!--${nonce}-->` : doc}
                sandbox="allow-scripts allow-forms allow-modals allow-popups"
                className="h-full border-0 bg-white"
                style={{ width: DEVICES[device].width, maxWidth: "100%" }}
              />
            </div>
            {tab === "data" && <SubmissionsPanel projectId={projectId} tick={subTick} />}
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
