"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Pencil, Sparkles } from "lucide-react";
import { toRepoFiles } from "@/lib/exportProject";
import { createZip, downloadBlob } from "@/lib/zip";
import Chat from "@/components/Chat";
import Preview from "@/components/Preview";
import GitHubSync from "@/components/GitHubSync";
import DeployButton from "@/components/DeployButton";
import { getProject, saveProject, type Message, type Project } from "@/lib/store";
import { parseAssistant } from "@/lib/parse";
import { EXPAND_BELOW_CHARS, EXPAND_PROMPT, fixPrompt } from "@/lib/prompt";
import { sameFiles, versionNumber } from "@/lib/versions";
import { THEME_PATH, serializeTheme, type Theme } from "@/lib/theme";
import { getSupabase } from "@/lib/supabase";
import { compactFiles, restoreAll, type AssetTable } from "@/lib/assets";

const VISUAL_NOTE = "Visual edits applied.";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  // Width of the chat panel (user-resizable, remembered in this browser).
  const [chatWidth, setChatWidth] = useState(400);
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    try {
      const w = Number(localStorage.getItem("lovable-clone:chat-width"));
      if (w >= 320 && w <= 640) setChatWidth(w);
    } catch {}
  }, []);
  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setChatWidth(Math.max(320, Math.min(640, e.clientX)));
    const up = () => setResizing(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [resizing]);
  useEffect(() => {
    if (resizing) return;
    try {
      localStorage.setItem("lovable-clone:chat-width", String(chatWidth));
    } catch {}
  }, [resizing, chatWidth]);

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
  const runRef = useRef<((p: Project) => Promise<void>) | null>(null);
  const fixBudget = useRef(0); // automatic error-fix attempts left for this generation
  const autoFixing = useRef(false);
  const lastAutoFixed = useRef("");

  const run = useCallback(async (p: Project) => {
    setBusy(true);
    setStreaming("");
    let raw = "";
    // Embedded images are replaced by short placeholders for the model, then restored.
    const compact = compactFiles(p.files);
    assetTable.current = compact.table;
    try {
      // Signed-in users send their session token (needed when the server has REQUIRE_AUTH=true).
      const session = await getSupabase()?.auth.getSession();
      const token = session?.data.session?.access_token;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
    autoFixing.current = false;
    // Each user-driven (or expand) generation gets up to 2 automatic error-fix attempts.
    if (!failed && p.messages[p.messages.length - 1]?.auto !== "fix") fixBudget.current = 2;

    // The first version of a new project is often thin: run one automatic expand pass.
    const total = Object.values(merged).reduce((n, c) => n + c.length, 0);
    let autoOn = true;
    try {
      autoOn = localStorage.getItem("lovable-clone:auto-expand") !== "off";
    } catch {}
    if (
      !failed &&
      autoOn &&
      Object.keys(p.files).length === 0 &&
      total < EXPAND_BELOW_CHARS &&
      !p.messages.some((m) => m.auto === true || m.auto === "expand")
    ) {
      const follow: Project = {
        ...next,
        messages: [...next.messages, { role: "user", content: EXPAND_PROMPT, auto: "expand" }],
      };
      await saveProject(follow);
      setProject(follow);
      setStreaming("");
      return runRef.current?.(follow);
    }

    setStreaming(null);
    setBusy(false);
  }, []);
  runRef.current = run;

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

  const onThemeChange = (theme: Theme) => {
    const p = projectRef.current;
    if (!p || busy) return;
    const json = serializeTheme(theme);
    if (p.files[THEME_PATH] === json) return;
    pushHistory(p.files);
    applyFiles({ ...p.files, [THEME_PATH]: json });
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

  // The preview threw right after a generation: ask the AI to fix it, up to 2 times.
  const onRuntimeError = (err: string) => {
    const p = projectRef.current;
    if (!p || busy || autoFixing.current || fixBudget.current <= 0) return;
    if (Object.keys(p.files).length === 0 || err === lastAutoFixed.current) return;
    fixBudget.current -= 1;
    autoFixing.current = true;
    lastAutoFixed.current = err;
    const next: Project = {
      ...p,
      messages: [...p.messages, { role: "user", content: fixPrompt(err.slice(0, 1500)), auto: "fix" }],
    };
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
    <div className="flex h-screen flex-col">
      {/* Top bar: where you are, and what you can do with the project */}
      <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-white/[.08] bg-[#0a0a10] px-3">
        <Link href="/" title="All projects" className="icon-btn">
          <ArrowLeft size={17} />
        </Link>
        <Link
          href="/"
          title="Home"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-950/50"
        >
          <Sparkles size={14} className="text-white" />
        </Link>
        <span className="mx-1 h-5 w-px bg-white/10" />
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
            className="field w-72 py-1"
          />
        ) : (
          <button
            onClick={() => {
              setNameDraft(project.name);
              setRenaming(true);
            }}
            title="Rename project"
            className="group flex min-w-0 max-w-[40vw] items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium hover:bg-white/[.06]"
          >
            <span className="truncate">{project.name}</span>
            <Pencil size={12} className="shrink-0 text-white/0 transition group-hover:text-white/50" />
          </button>
        )}
        {busy && (
          <span className="ml-1 flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" /> Working
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() =>
              downloadBlob(
                createZip(toRepoFiles(project.files, project.name)),
                `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "app"}.zip`
              )
            }
            disabled={Object.keys(project.files).length === 0}
            title="Download as a runnable Vite project (.zip)"
            className="btn-ghost h-8 px-2.5"
          >
            <Download size={14} /> <span className="hidden md:inline">Download</span>
          </button>
          <GitHubSync projectId={project.id} name={project.name} files={project.files} />
          <DeployButton projectId={project.id} name={project.name} files={project.files} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
      <aside style={{ width: chatWidth }} className="flex shrink-0 flex-col bg-[#0b0b11]">
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
      {/* Drag to resize the chat panel */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setResizing(true);
        }}
        onDoubleClick={() => setChatWidth(400)}
        title="Drag to resize (double-click to reset)"
        className="group relative z-10 w-1.5 shrink-0 cursor-col-resize bg-white/[.06] transition hover:bg-violet-400/50"
      >
        <span className="absolute left-1/2 top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 group-hover:bg-white/60" />
      </div>
      {resizing && <div className="fixed inset-0 z-50 cursor-col-resize" />}
      <main className="min-w-0 flex-1">
        <Preview
          files={liveFiles}
          projectId={project.id}
          onSourceEdit={onSourceEdit}
          onRuntimeError={onRuntimeError}
          onThemeChange={onThemeChange}
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
    </div>
  );
}
