"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Chat from "@/components/Chat";
import Preview from "@/components/Preview";
import GitHubSync from "@/components/GitHubSync";
import DeployButton from "@/components/DeployButton";
import { getProject, saveProject, type Message, type Project } from "@/lib/store";
import { parseAssistant } from "@/lib/parse";
import { versionNumber } from "@/lib/versions";
import { compactFiles, restoreAll, type AssetTable } from "@/lib/assets";

const VISUAL_NOTE = "Visual edits applied.";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  const assetTable = useRef<AssetTable>({});
  const projectRef = useRef<Project | null>(null);
  projectRef.current = project;

  const run = useCallback(async (p: Project) => {
    setBusy(true);
    setStreaming("");
    let raw = "";
    // Embedded images are replaced by short placeholders for the model, then restored.
    const compact = compactFiles(p.files);
    assetTable.current = compact.table;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Strip snapshots; only the latest message carries its images (keeps requests small).
        body: JSON.stringify({
          messages: p.messages.map((m, i) => ({
            role: m.role,
            content: m.content,
            ...(i === p.messages.length - 1 && m.images ? { images: m.images } : {}),
          })),
          files: compact.files,
        }),
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
    const merged = { ...p.files, ...restoreAll(parseAssistant(raw).files, compact.table) };
    const next: Project = {
      ...p,
      files: merged,
      messages: [...p.messages, { role: "assistant", content: raw, snapshot: merged }],
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
    const done = restoreAll(files, assetTable.current);
    if (openPath) delete done[openPath]; // don't compile half-written files
    return { ...project.files, ...done };
  }, [project, streaming]);

  if (!project) return null;

  const send = (text: string, images: string[]) => {
    const messages: Message[] = [
      ...project.messages,
      { role: "user", content: text, ...(images.length ? { images } : {}) },
    ];
    const next = { ...project, messages };
    saveProject(next);
    setProject(next);
    run(next);
  };

  // A change made in the visual editor: update the file, and fold consecutive
  // visual edits into one "Visual edits" version instead of spamming history.
  const onSourceEdit = (path: string, source: string) => {
    const p = projectRef.current;
    if (!p) return;
    const files = { ...p.files, [path]: source };
    const last = p.messages[p.messages.length - 1];
    const messages: Message[] =
      last?.role === "assistant" && last.content === VISUAL_NOTE
        ? [...p.messages.slice(0, -1), { ...last, snapshot: files }]
        : [...p.messages, { role: "assistant", content: VISUAL_NOTE, snapshot: files }];
    const next: Project = { ...p, files, messages };
    projectRef.current = next;
    saveProject(next);
    setProject(next);
  };

  const restore = (index: number) => {
    const snap = project.messages[index]?.snapshot;
    if (!snap || busy) return;
    const next: Project = {
      ...project,
      files: snap,
      messages: [
        ...project.messages,
        { role: "assistant", content: `Restored the version from step ${versionNumber(project.messages, index)}.`, snapshot: snap },
      ],
    };
    saveProject(next);
    setProject(next);
  };

  return (
    <div className="flex h-screen">
      <aside className="flex w-[380px] shrink-0 flex-col border-r border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Link href="/" className="text-white/50 hover:text-white">
            <ArrowLeft size={16} />
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
          <GitHubSync projectId={project.id} name={project.name} files={project.files} />
          <DeployButton projectId={project.id} name={project.name} files={project.files} />
        </div>
        <div className="min-h-0 flex-1">
          <Chat
            messages={project.messages}
            currentFiles={project.files}
            streaming={streaming}
            busy={busy}
            onSend={send}
            onRestore={restore}
          />
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Preview
          files={liveFiles}
          projectId={project.id}
          onSourceEdit={onSourceEdit}
          editDisabled={busy}
          onFix={
            busy
              ? undefined
              : (err) =>
                  send(
                    `The preview crashed with this runtime error. Find the cause and fix it:\n\n${err}`,
                    []
                  )
          }
        />
      </main>
    </div>
  );
}
