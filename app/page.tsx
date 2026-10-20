"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, Check, Copy, Heart, Pencil, Trash2 } from "lucide-react";
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
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 pt-24">
      <div className="absolute right-6 top-5">
        <AuthButton onChange={refresh} />
      </div>
      <h1 className="flex items-center gap-3 text-5xl font-bold tracking-tight">
        Build something <Heart className="fill-pink-500 text-pink-500" size={44} />
      </h1>
      <p className="mt-3 text-white/50">Describe an app and watch it get built.</p>

      <div className="mt-10 w-full max-w-3xl rounded-2xl border border-white/15 bg-white/5 p-3" {...att.handlers}>
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
          placeholder="Ask me to build a landing page for..."
          className="w-full resize-none bg-transparent p-2 outline-none placeholder:text-white/30"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AttachButton onFiles={att.add} />
            <label
              className="flex cursor-pointer items-center gap-1.5 text-xs text-white/45 hover:text-white/70"
              title="The AI asks a few questions first so the result matches what you want"
            >
              <input
                type="checkbox"
                checked={askFirst}
                onChange={(e) => toggleAsk(e.target.checked)}
                className="accent-violet-500"
              />
              Ask me questions first
            </label>
          </div>
          <button
            onClick={() => start(prompt, true)}
            disabled={!prompt.trim() && !att.images.length}
            className="rounded-lg bg-violet-600 p-2 disabled:opacity-40"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>

      <section className="mt-12 w-full">
        <h2 className="mb-3 text-sm font-medium text-white/50">Start from a template</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => start(t.prompt)}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-violet-400/60 hover:bg-white/10"
            >
              <span className="text-2xl">{t.emoji}</span>
              <span>
                <span className="block text-sm font-medium">{t.title}</span>
                <span className="block text-xs text-white/45">{t.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {clarify && (
        <ClarifyDialog
          prompt={clarify}
          hasImage={att.images.length > 0}
          onBuild={(details) => build(clarify, details)}
          onCancel={() => setClarify(null)}
        />
      )}

      {projects.length > 0 && (
        <section className="mt-14 w-full pb-16">
          <h2 className="mb-3 text-sm font-medium text-white/50">Your projects</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/30"
              >
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
                    className="min-w-0 flex-1 rounded-md border border-white/20 bg-black/30 px-2 py-1 text-sm outline-none"
                  />
                ) : (
                  <Link href={`/project/${p.id}`} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-white/40">{new Date(p.updatedAt).toLocaleString()}</div>
                  </Link>
                )}
                <div className="ml-2 flex items-center gap-1.5 text-white/35 opacity-0 group-hover:opacity-100">
                  {renaming === p.id ? (
                    <button onClick={() => commitRename(p.id)} title="Save name" className="hover:text-emerald-400">
                      <Check size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setDraft(p.name);
                        setRenaming(p.id);
                      }}
                      title="Rename"
                      className="hover:text-white"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await duplicateProject(p.id);
                      refresh();
                    }}
                    title="Duplicate"
                    className="hover:text-white"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
                      await deleteProject(p.id);
                      refresh();
                    }}
                    title="Delete"
                    className="hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
