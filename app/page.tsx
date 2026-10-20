"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, Heart, Trash2 } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import { AttachButton, Thumbs, useAttachments } from "@/components/Attachments";
import { createProject, deleteProject, listProjects, type Project } from "@/lib/store";

const IDEAS = [
  "A habit tracker with streaks and a weekly chart",
  "A SaaS landing page for an AI note-taking app",
  "A kanban board with column moves",
  "A personal finance dashboard with spending categories",
];

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);

  const refresh = () => listProjects().then(setProjects);
  useEffect(() => {
    refresh();
  }, []);

  const att = useAttachments();

  const start = async (text: string) => {
    const t = text.trim();
    if (!t && !att.images.length) return;
    const p = await createProject(t, att.images);
    router.push(`/project/${p.id}`);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-6 pt-28">
      <div className="absolute right-6 top-5">
        <AuthButton onChange={refresh} />
      </div>
      <h1 className="flex items-center gap-3 text-5xl font-bold tracking-tight">
        Build something <Heart className="fill-pink-500 text-pink-500" size={44} />
      </h1>
      <p className="mt-3 text-white/50">Describe an app and watch it get built.</p>

      <div className="mt-10 w-full rounded-2xl border border-white/15 bg-white/5 p-3" {...att.handlers}>
        <Thumbs images={att.images} onRemove={att.remove} />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              start(prompt);
            }
          }}
          rows={3}
          placeholder="Ask me to build a landing page for..."
          className="w-full resize-none bg-transparent p-2 outline-none placeholder:text-white/30"
        />
        <div className="flex items-center justify-between">
          <AttachButton onFiles={att.add} />
          <button
            onClick={() => start(prompt)}
            disabled={!prompt.trim() && !att.images.length}
            className="rounded-lg bg-violet-600 p-2 disabled:opacity-40"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {IDEAS.map((i) => (
          <button
            key={i}
            onClick={() => start(i)}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-white/30 hover:text-white"
          >
            {i}
          </button>
        ))}
      </div>

      {projects.length > 0 && (
        <section className="mt-16 w-full pb-16">
          <h2 className="mb-3 text-sm font-medium text-white/50">Your projects</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/30"
              >
                <Link href={`/project/${p.id}`} className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-white/40">
                    {new Date(p.updatedAt).toLocaleString()}
                  </div>
                </Link>
                <button
                  onClick={async () => {
                    await deleteProject(p.id);
                    refresh();
                  }}
                  className="ml-2 text-white/30 opacity-0 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
