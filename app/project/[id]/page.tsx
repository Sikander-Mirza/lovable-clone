"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { toRepoFiles } from "@/lib/exportProject";
import { createZip, downloadBlob } from "@/lib/zip";
import Chat from "@/components/Chat";
import Preview from "@/components/Preview";
import GitHubSync from "@/components/GitHubSync";
import DeployButton from "@/components/DeployButton";
import { getProject, saveProject, type Message, type Project } from "@/lib/store";
import { parseAssistant } from "@/lib/parse";
import { sameFiles, versionNumber } from "@/lib/versions";
import { compactFiles, restoreAll, type AssetTable } from "@/lib/assets";

const VISUAL_NOTE = "Visual edits applied.";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const assetTable = useRef<AssetTable>({});
  // In-memory undo/redo stacks of whole-project file states (lost on reload; the
  // permanent history is the version list in the chat).
  const past = useRef<Record<string, string>[]>([]);
  const future = useRef<Record<string, string>[]>([]);
  const [, setHist] = useState(0);
  const pushHistory = (files: Record<string, string>) => {
    past.current.push(files);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    setHist((n) => n + 1);
  };
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
            content: m.details ? `${m.content}\n\n${m.details}` : m.content,
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
    const parsed = restoreAll(parseAssistant(raw).files, compact.table);
    const merged = { ...p.files, ...parsed };
    // A failed request (no files, only an error) must not become a "version".
    const failed = Object.keys(parsed).length === 0 && raw.includes("[error]");
    const next: Project = {
      ...p,
      files: merged,
      messages: [
        ...p.messages,
        failed ? { role: "assistant", content: raw } : { role: "assistant", content: raw, snapshot: merged },
      ],
    };
    if (!sameFiles(p.files, merged)) pushHistory(p.files);
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
  const applyFiles = (files: Record<string, string>) => {
    const p = projectRef.current;
    if (!p) return;
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

  const onSourceEdit = (path: string, source: string) => {
    const p = projectRef.current;
    if (!p) return;
    pushHistory(p.files);
    applyFiles({ ...p.files, [path]: source });
  };

  const undo = () => {
    const prev = past.current.pop();
    const p = projectRef.current;
    if (!prev || !p || busy) return void (prev && past.current.push(prev));
    future.current.push(p.files);
    setHist((n) => n + 1);
    applyFiles(prev);
  };

  const redo = () => {
    const next = future.current.pop();
    const p = projectRef.current;
    if (!next || !p || busy) return void (next && future.current.push(next));
    past.current.push(p.files);
    setHist((n) => n + 1);
    applyFiles(next);
  };

  // Re-run the last request after a failed generation (drops the error message first).
  const retry = () => {
    const p = projectRef.current;
    if (!p || busy) return;
    const last = p.messages[p.messages.length - 1];
    if (!(last?.role === "assistant" && !last.snapshot && last.content.includes("[error]"))) return;
    const next = { ...p, messages: p.messages.slice(0, -1) };
    projectRef.current = next;
    saveProject(next);
    setProject(next);
    run(next);
  };

  const commitName = () => {
    const p = projectRef.current;
    setRenaming(false);
    const name = nameDraft.trim().slice(0, 80);
    if (!p || !name || name === p.name) return;
    const next = { ...p, name };
    projectRef.current = next;
    saveProject(next);
    setProject(next);
  };

  const restore = (index: number) => {
    const snap = project.messages[index]?.snapshot;
    if (!snap || busy) return;
    pushHistory(project.files);
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
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="min-w-0 flex-1 rounded-md border border-white/20 bg-black/30 px-2 py-0.5 text-sm outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setNameDraft(project.name);
                setRenaming(true);
              }}
              title="Rename project"
              className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-violet-300"
            >
              {project.name}
            </button>
          )}
          <button
            onClick={() =>
              downloadBlob(
                createZip(toRepoFiles(project.files, project.name)),
                `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "app"}.zip`
              )
            }
            disabled={Object.keys(project.files).length === 0}
            title="Download as a runnable Vite project (.zip)"
            className="rounded-md border border-white/15 p-1.5 text-white/70 hover:bg-white/10 disabled:opacity-40"
          >
            <Download size={13} />
          </button>
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
            onRetry={retry}
          />
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Preview
          files={liveFiles}
          projectId={project.id}
          onSourceEdit={onSourceEdit}
          editDisabled={busy}
          canUndo={past.current.length > 0 && !busy}
          canRedo={future.current.length > 0 && !busy}
          onUndo={undo}
          onRedo={redo}
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
