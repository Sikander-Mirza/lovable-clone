"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUp, Check, Copy, Pencil, Sparkles, Trash2 } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import ClarifyDialog from "@/components/ClarifyDialog";
import { AttachButton, Thumbs, useAttachments } from "@/components/Attachments";
import {
  createProject,
  deleteProject,
  duplicateProject,
  listProjects,
  renameProject,
  type Project,
} from "@/lib/store";
import { TEMPLATES } from "@/lib/templates";

// A stable gradient per project, so cards are easy to tell apart at a glance.
const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-blue-500",
];
const gradientFor = (id: string) => GRADIENTS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % GRADIENTS.length];

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : new Date(t).toLocaleDateString();
};

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={hint}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
        checked
          ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
          : "border-white/10 bg-white/[.03] text-white/45 hover:text-white/70"
      }`}
    >
      <span
        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
          checked ? "bg-violet-500 text-white" : "border border-white/25"
        }`}
      >
        {checked && <Check size={9} strokeWidth={3.5} />}
      </span>
      {label}
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const refresh = () => listProjects().then(setProjects);
  useEffect(() => {
    refresh();
  }, []);

  const att = useAttachments();

  // Ask a few clarifying questions before building (remembered per browser).
  const [askFirst, setAskFirst] = useState(true);
  const [clarify, setClarify] = useState<string | null>(null);
  useEffect(() => {
    try {
      setAskFirst(localStorage.getItem("lovable-clone:ask-questions") !== "off");
    } catch {}
  }, []);

  // After the first version, let the AI run one extra pass to expand thin results.
  const [autoExpand, setAutoExpand] = useState(true);
  useEffect(() => {
    try {
      setAutoExpand(localStorage.getItem("lovable-clone:auto-expand") !== "off");
    } catch {}
  }, []);
  const toggleExpand = (on: boolean) => {
    setAutoExpand(on);
    try {
      localStorage.setItem("lovable-clone:auto-expand", on ? "on" : "off");
    } catch {}
  };

  const toggleAsk = (on: boolean) => {
    setAskFirst(on);
    try {
      localStorage.setItem("lovable-clone:ask-questions", on ? "on" : "off");
    } catch {}
  };

  const build = async (text: string, details = "") => {
    const p = await createProject(text, att.images, details);
    router.push(`/project/${p.id}`);
  };

  /** `ask`: custom prompts get questions first; templates are already detailed, so they don't. */
  const start = async (text: string, ask = false) => {
    const t = text.trim();
    if (!t && !att.images.length) return;
    if (ask && askFirst && t.length >= 3) setClarify(t);
    else await build(t);
  };

  const commitRename = async (id: string) => {
    if (draft.trim()) await renameProject(id, draft);
    setRenaming(null);
    refresh();
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[560px]" />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-900/40">
            <Sparkles size={16} className="text-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Lovable Clone</span>
        </div>
        <AuthButton onChange={refresh} />
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-14 sm:pt-20">
        {/* Hero */}
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs text-white/60">
          <Sparkles size={12} className="text-violet-300" /> AI website builder
        </span>
        <h1 className="text-center text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Describe it.
          <br />
          <span className="gradient-text">Watch it get built.</span>
        </h1>
        <p className="mt-5 max-w-xl text-center text-base text-white/50 sm:text-lg">
          Turn an idea into a real, editable website in minutes. Tweak it visually, then publish it.
        </p>

        {/* Prompt box */}
        <div className="mt-10 w-full max-w-3xl rounded-2xl bg-gradient-to-r from-violet-500/50 via-fuchsia-500/40 to-pink-500/50 p-px shadow-2xl shadow-violet-950/40">
          <div className="rounded-[15px] bg-[#0d0d14] p-3" {...att.handlers}>
            <Thumbs images={att.images} onRemove={att.remove} />
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  start(prompt, true);
                }
              }}
              rows={3}
              placeholder="Ask me to build a landing page for a coffee shop..."
              className="w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-white/30"
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <AttachButton onFiles={att.add} />
                <Toggle
                  checked={askFirst}
                  onChange={toggleAsk}
                  label="Ask me questions first"
                  hint="A short questionnaire first, so the result matches what you want"
                />
                <Toggle
                  checked={autoExpand}
                  onChange={toggleExpand}
                  label="Build thoroughly"
                  hint="After the first version, the AI automatically expands it into a fuller site (about a minute longer)"
                />
              </div>
              <button
                onClick={() => start(prompt, true)}
                disabled={!prompt.trim() && !att.images.length}
                title="Build"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-900/40 transition hover:brightness-110 disabled:opacity-30 disabled:shadow-none"
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/30">Press Enter to start · Shift+Enter for a new line · paste or drop an image for a reference</p>

        {/* Templates */}
        <section className="mt-20 w-full">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Start from a template</h2>
              <p className="text-sm text-white/40">Detailed starting points. Click one to build it right away.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((t, i) => (
              <button
                key={t.id}
                onClick={() => start(t.prompt)}
                className="group relative flex items-start gap-3.5 overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.03] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-white/[.06] hover:shadow-xl hover:shadow-violet-950/30"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-lg ${GRADIENTS[i % GRADIENTS.length]} shadow-black/30`}
                >
                  {t.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t.title}</span>
                  <span className="mt-0.5 block text-xs text-white/45">{t.blurb}</span>
                </span>
                <ArrowRight
                  size={16}
                  className="mt-1 shrink-0 -translate-x-1 text-white/0 transition group-hover:translate-x-0 group-hover:text-violet-300"
                />
              </button>
            ))}
          </div>
        </section>

        {/* Projects */}
        {projects.length > 0 && (
          <section className="mt-16 w-full">
            <div className="mb-4 flex items-baseline gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Your projects</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">{projects.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.03] p-3.5 transition hover:border-white/20 hover:bg-white/[.06]"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base font-bold uppercase text-white shadow-lg shadow-black/30 ${gradientFor(p.id)}`}
                  >
                    {(p.name.replace(/^https?:\/\/(www\.)?/, "")[0] || "?").toUpperCase()}
                  </span>
                  {renaming === p.id ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commitRename(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(p.id);
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="field min-w-0 flex-1 py-1"
                    />
                  ) : (
                    <Link href={`/project/${p.id}`} className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-white/40">
                        {ago(p.updatedAt)} · {Object.keys(p.files).filter((f) => f !== "/theme.json").length} files
                      </div>
                    </Link>
                  )}
                  <div className="flex items-center opacity-0 transition group-hover:opacity-100">
                    {renaming === p.id ? (
                      <button onClick={() => commitRename(p.id)} title="Save name" className="icon-btn h-7 w-7 hover:text-emerald-400">
                        <Check size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDraft(p.name);
                          setRenaming(p.id);
                        }}
                        title="Rename"
                        className="icon-btn h-7 w-7"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        await duplicateProject(p.id);
                        refresh();
                      }}
                      title="Duplicate"
                      className="icon-btn h-7 w-7"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
                        await deleteProject(p.id);
                        refresh();
                      }}
                      title="Delete"
                      className="icon-btn h-7 w-7 hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {clarify && (
        <ClarifyDialog prompt={clarify} onBuild={(details) => build(clarify, details)} onCancel={() => setClarify(null)} />
      )}
    </div>
  );
}
