"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { useEscape } from "@/lib/useEscape";
import { getShareState, publishShare, shareUrl, stopSharing, type ShareState } from "@/lib/share";
import type { Project } from "@/lib/store";

/** Header button: publish a read-only link to a snapshot of the project. */
export default function ShareButton({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));
  const [state, setState] = useState<ShareState | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasFiles = Object.keys(project.files).length > 0;

  useEffect(() => {
    if (!open) return;
    setState(null);
    getShareState(project.id).then(setState);
  }, [open, project.id]);

  const url = state?.status === "shared" ? shareUrl(window.location.origin, state.id) : "";

  const publish = async () => {
    setBusy(true);
    setState(await publishShare(project, state?.status === "shared" ? state.id : undefined));
    setBusy(false);
  };
  const stop = async () => {
    setBusy(true);
    if (await stopSharing(project.id)) setState({ status: "none" });
    setBusy(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!hasFiles}
        title="Share a read-only link"
        aria-label="Share a read-only link"
        className="btn-ghost h-8 px-2.5"
      >
        <Link2 size={14} /> <span className="hidden lg:inline">Share</span>
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Share a read-only link"
            className="w-full max-w-md space-y-3 modal p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Link2 size={18} /> Share a link
            </h2>
            <p className="text-sm leading-snug text-white/65">
              Anyone with the link can view the site, but not edit it. The link shows a snapshot, so update it after you make changes.
            </p>

            {state === null && (
              <div className="flex items-center gap-2 text-sm text-white/65">
                <Loader2 size={14} className="animate-spin" /> Checking…
              </div>
            )}
            {state?.status === "unavailable" && (
              <div role="status" className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {state.reason}
              </div>
            )}
            {state?.status === "none" && (
              <button onClick={publish} disabled={busy} className="btn-primary h-9 w-full">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Create share link
              </button>
            )}
            {state?.status === "shared" && (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={url}
                    aria-label="Share link"
                    onFocus={(e) => e.currentTarget.select()}
                    className="field min-w-0 flex-1 text-xs"
                  />
                  <button onClick={copy} className="btn-ghost h-9 px-3" aria-label="Copy link">
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="text-xs text-white/60">Snapshot from {new Date(state.updatedAt).toLocaleString()}</div>
                <div className="flex gap-2">
                  <button onClick={publish} disabled={busy} className="btn-ghost h-8 flex-1 text-xs">
                    {busy ? <Loader2 size={12} className="animate-spin" /> : null} Update with latest changes
                  </button>
                  <button onClick={stop} disabled={busy} className="btn-ghost h-8 px-3 text-xs hover:text-red-300">
                    Stop sharing
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
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
