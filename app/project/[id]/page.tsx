"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Chat from "@/components/Chat";
import Preview from "@/components/Preview";
import { getProject, saveProject, type Message, type Project } from "@/lib/store";
import { parseAssistant } from "@/lib/parse";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const run = useCallback(async (p: Project) => {
    setBusy(true);
    setStreaming("");
    let raw = "";
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: p.messages, files: p.files }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
        setStreaming(raw);
      }
    } catch (e: any) {
      raw += `\n\n[error] ${e?.message ?? "request failed"}`;
    }
    const { files } = parseAssistant(raw);
    const next: Project = {
      ...p,
      files: { ...p.files, ...files },
      messages: [...p.messages, { role: "assistant", content: raw }],
    };
    await saveProject(next);
    setProject(next);
    setStreaming(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    getProject(id).then((p) => {
      if (!p) return router.replace("/");
      setProject(p);
      // A brand-new project has only the first user message: kick off generation.
      if (!started.current && p.messages.length === 1 && p.messages[0].role === "user") {
        started.current = true;
        run(p);
      }
    });
  }, [id, router, run]);

  // Live files = saved files overlaid with whatever has streamed in so far.
  const liveFiles = useMemo(() => {
    if (!project) return {};
    if (streaming === null) return project.files;
    const { files, openPath } = parseAssistant(streaming);
    const done = { ...files };
    if (openPath) delete done[openPath]; // don't compile half-written files
    return { ...project.files, ...done };
  }, [project, streaming]);

  if (!project) return null;

  const send = (text: string) => {
    const messages: Message[] = [...project.messages, { role: "user", content: text }];
    const next = { ...project, messages };
    saveProject(next);
    setProject(next);
    run(next);
  };

  return (
    <div className="flex h-screen">
      <aside className="flex w-[380px] shrink-0 flex-col border-r border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Link href="/" className="text-white/50 hover:text-white">
            <ArrowLeft size={16} />
          </Link>
          <span className="truncate text-sm font-medium">{project.name}</span>
        </div>
        <div className="min-h-0 flex-1">
          <Chat messages={project.messages} streaming={streaming} busy={busy} onSend={send} />
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Preview files={liveFiles} />
      </main>
    </div>
  );
}
