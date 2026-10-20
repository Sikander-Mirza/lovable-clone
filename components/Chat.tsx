"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, FileCode2, Loader2 } from "lucide-react";
import type { Message } from "@/lib/store";
import { parseAssistant } from "@/lib/parse";

type Props = {
  messages: Message[];
  streaming: string | null; // raw in-flight assistant text
  busy: boolean;
  onSend: (text: string) => void;
};

function AssistantBubble({ raw, live }: { raw: string; live?: boolean }) {
  const { files, openPath, text } = parseAssistant(raw);
  const paths = Object.keys(files);
  return (
    <div className="space-y-2">
      {text && <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">{text}</p>}
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
    </div>
  );
}

export default function Chat({ messages, streaming, busy, onSend }: Props) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    setInput("");
    onSend(t);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-violet-600 px-3.5 py-2 text-sm">
              {m.content}
            </div>
          ) : (
            <AssistantBubble key={i} raw={m.content} />
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

      <div className="border-t border-white/10 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-white/15 bg-white/5 p-2">
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
            disabled={busy || !input.trim()}
            className="rounded-lg bg-violet-600 p-2 text-white disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
