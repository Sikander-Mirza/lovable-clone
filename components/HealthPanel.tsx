"use client";

import PopoverClose from "./PopoverClose";
import { useEscape } from "@/lib/useEscape";

import { useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Eye, Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { visualReviewPrompt } from "@/lib/review";
import { healthFixPrompt, probeChecks, score, staticChecks, type Check, type Group, type Probe } from "@/lib/health";

const GROUPS: Group[] = ["SEO", "Accessibility", "Mobile", "Speed"];

const tone = (n: number) => (n >= 85 ? "text-emerald-400" : n >= 60 ? "text-amber-300" : "text-red-400");

/** "Health" popover: SEO, accessibility, mobile and speed checks, with a one-click AI fix. */
export default function HealthPanel({
  files,
  runProbe,
  captureReview,
  onAskAI,
}: {
  files: Record<string, string>;
  /** Measures the running preview at phone width; resolves null if it could not. */
  runProbe: () => Promise<Probe | null>;
  /** Screenshots of the preview (desktop, then phone) for the visual review; resolves [] on failure. */
  captureReview?: () => Promise<{ shots: string[]; findings: string }>;
  onAskAI: (prompt: string, images?: string[], label?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));
  const [alignRight, setAlignRight] = useState(false);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [live, setLive] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState(false);

  const startReview = async () => {
    if (!captureReview) return;
    setReviewing(true);
    setReviewError(false);
    const { shots, findings } = await captureReview();
    setReviewing(false);
    if (!shots.length) return setReviewError(true);
    setOpen(false);
    onAskAI(visualReviewPrompt(shots.length, findings), shots, "Visual design review of my site (screenshots attached)");
  };

  const run = async () => {
    setBusy(true);
    const probe = await runProbe();
    setLive(!!probe);
    setChecks([...staticChecks(files), ...(probe ? probeChecks(probe) : [])]);
    setBusy(false);
  };

  const total = checks ? score(checks) : null;
  const prompt = checks ? healthFixPrompt(checks) : "";
  const problems = checks ? checks.filter((c) => c.status === "fail" || c.status === "warn").length : 0;

  const icon = (s: Check["status"]) =>
    s === "pass" ? <CheckCircle2 size={13} className="text-emerald-400" /> : s === "warn" ? <AlertTriangle size={13} className="text-amber-300" /> : <XCircle size={13} className="text-red-400" />;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          const r = ref.current?.getBoundingClientRect();
          if (r) setAlignRight(r.left + 360 > window.innerWidth - 12);
          const next = !open;
          setOpen(next);
          if (next) run();
        }}
        title="Check SEO, accessibility, mobile and speed"
        className="tool-btn"
        data-open={open}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Site health report"
      >
        <Activity size={14} /> <span className="tool-label">Health</span>
        {total !== null && !open && <span className={`text-xs font-semibold ${tone(total)}`}>{total}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Site health report"
            className={`popover absolute top-full z-50 mt-2 max-h-[78vh] w-[360px] max-w-[calc(100vw-24px)] overflow-y-auto p-4 ${
              alignRight ? "right-0" : "left-0"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold ${total === null ? "border-white/15 text-white/60" : `${tone(total)} border-current`}`}>
                {busy || total === null ? <Loader2 size={18} className="animate-spin" /> : total}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Site health</div>
                <div className="text-xs leading-snug text-white/60">
                  {busy ? "Checking the page at phone width..." : problems ? `${problems} thing${problems === 1 ? "" : "s"} to improve` : "Everything checked looks good"}
                </div>
              </div>
              <button onClick={run} disabled={busy} title="Check again" className="icon-btn">
                <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
              </button>
            </div>

            {checks && (
              <div className="mt-4 space-y-4">
                {GROUPS.map((g) => {
                  const items = checks.filter((c) => c.group === g);
                  if (!items.length) return null;
                  return (
                    <div key={g}>
                      <div className="mb-1.5 flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
                        {g}
                        <span className={tone(score(items))}>{score(items)}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {items.map((c) => (
                          <li key={c.id} className="flex gap-2 text-xs">
                            <span className="mt-0.5 shrink-0">{icon(c.status)}</span>
                            <span className="min-w-0">
                              <span className="text-white/85">{c.label}</span>
                              {c.detail && <span className="block text-xs leading-snug text-white/60">{c.detail}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {!live && (
                  <p className="text-xs leading-snug text-amber-300/80">
                    The live checks (headings, alt text, labels, sideways scrolling) could not run because the preview did not respond. Only the checks from the code are shown.
                  </p>
                )}
              </div>
            )}

            {prompt && (
              <button
                onClick={() => {
                  setOpen(false);
                  onAskAI(prompt);
                }}
                className="btn-primary mt-4 h-9 w-full text-sm"
              >
                <Sparkles size={14} /> Fix {problems} thing{problems === 1 ? "" : "s"} with AI
              </button>
            )}
            {captureReview && (
              <div className="mt-4 border-t border-white/10 pt-3">
                <button onClick={startReview} disabled={reviewing || busy} className="btn-ghost h-9 w-full text-sm">
                  {reviewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  {reviewing ? "Taking screenshots…" : "Visual review with AI"}
                </button>
                <p className="mt-1.5 text-xs leading-snug text-white/60">
                  The AI looks at screenshots of your site (desktop and phone) and fixes layout problems the code checks cannot see.
                </p>
                {reviewError && (
                  <p role="status" className="mt-1.5 text-xs text-amber-300">
                    Could not take screenshots. Check your internet connection and try again.
                  </p>
                )}
              </div>
            )}
            <PopoverClose onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
