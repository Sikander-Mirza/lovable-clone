"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, FileCode2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { sameFiles, versionNumber } from "@/lib/versions";
import { AttachButton, Thumbs, useAttachments } from "./Attachments";
import type { Message } from "@/lib/store";
import { parseAssistant } from "@/lib/parse";

type Props = {
  messages: Message[];
  currentFiles: Record<string, string>;
  streaming: string | null; // raw in-flight assistant text
  busy: boolean;
  onSend: (text: string, images: string[]) => void;
  onRestore: (messageIndex: number) => void;
  onRetry: () => void;
};

function AssistantBubble({
  raw,
  live,
  version,
  onRestore,
  onRetry,
}: {
  raw: string;
  live?: boolean;
  /** Present on a failed reply that can be re-run. */
  onRetry?: () => void;
  version?: number;
  /** present only when this version differs from the current project state */
  onRestore?: () => void;
}) {
  const { files, openPath, text } = parseAssistant(raw);
  const paths = Object.keys(files);
  const isError = text.includes("[error]");
  return (
    <div className="space-y-2">
      {isError ? (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {text.replace(/^[\s\S]*?\[error\]\s*/, "")}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 flex items-center gap-1.5 rounded-md bg-red-500/25 px-2.5 py-1 text-xs font-medium text-red-100 hover:bg-red-500/40"
            >
              <RotateCcw size={11} /> Retry
            </button>
          )}
        </div>
      ) : (
        text && <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">{text}</p>
      )}
      {paths.length > 0 && (
        <div className="space-y-1">
          {paths.map((p) => (
            <div
              key={p}
              className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70"
            >
              {live && p === openPath ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileCode2 size={12} />
              )}
              {p}
            </div>
          ))}
        </div>
      )}
      {version !== undefined && (
        <div className="flex items-center gap-2 text-[11px] text-white/35">
          <span>Version {version}</span>
          {onRestore && (
            <button
              onClick={onRestore}
              className="flex items-center gap-1 rounded border border-white/15 px-1.5 py-0.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw size={10} /> Restore
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Chat({ messages, currentFiles, streaming, busy, onSend, onRestore, onRetry }: Props) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const att = useAttachments();

  const submit = () => {
    const t = input.trim();
    if ((!t && !att.images.length) || busy) return;
    setInput("");
    onSend(t || "Recreate the attached design.", att.images);
    att.clear();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) =>
          m.auto ? (
            <div key={i} className="flex items-center gap-1.5 text-xs text-violet-300/80">
              <Sparkles size={12} /> Expanding the site: adding missing sections and more detail...
            </div>
          ) : m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] space-y-2 rounded-2xl bg-violet-600 px-3.5 py-2 text-sm">
              {m.images && (
                <div className="flex flex-wrap gap-1.5">
                  {m.images.map((src, j) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={j} src={src} alt="attachment" className="h-20 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              {m.content}
              {m.details && (
                <ul className="space-y-0.5 border-t border-white/20 pt-2 text-xs text-white/75">
                  {m.details
                    .split("\n")
                    .filter((l) => l.startsWith("- "))
                    .map((l, j) => (
                      <li key={j}>{l.slice(2)}</li>
                    ))}
                </ul>
              )}
            </div>
          ) : (
            <AssistantBubble
              key={i}
              raw={m.content}
              onRetry={i === messages.length - 1 && !m.snapshot && !busy ? onRetry : undefined}
              version={m.snapshot ? versionNumber(messages, i) : undefined}
              onRestore={
                m.snapshot && !busy && !sameFiles(m.snapshot, currentFiles) ? () => onRestore(i) : undefined
              }
            />
          )
        )}
        {streaming !== null && <AssistantBubble raw={streaming} live />}
        {busy && streaming === "" && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 size={14} className="animate-spin" /> Thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-white/10 p-3" {...att.handlers}>
        <div className="rounded-xl border border-white/15 bg-white/5 p-2">
        <Thumbs images={att.images} onRemove={att.remove} />
        <div className="flex items-end gap-1">
          <AttachButton onFiles={att.add} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder="Ask for a change..."
            className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-white/30"
          />
          <button
            onClick={submit}
            disabled={busy || (!input.trim() && !att.images.length)}
            className="rounded-lg bg-violet-600 p-2 text-white disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
