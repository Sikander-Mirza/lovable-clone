"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Inbox, Trash2 } from "lucide-react";
import { deleteSubmission, listSubmissions, toCsv, type Submission } from "@/lib/submissions";
import { downloadBlob } from "@/lib/zip";

/** "Data" tab: everything the generated site's forms have collected. */
export default function SubmissionsPanel({ projectId, tick }: { projectId: string; tick: number }) {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [form, setForm] = useState<string>("all");

  const load = useCallback(() => listSubmissions(projectId).then(setRows), [projectId]);
  useEffect(() => {
    load();
  }, [load, tick]);

  if (!rows) return <div className="p-6 text-sm text-white/50">Loading...</div>;

  const forms = Array.from(new Set(rows.map((r) => r.form)));
  const shown = form === "all" ? rows : rows.filter((r) => r.form === form);

  if (!rows.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-white/45">
        <Inbox size={28} />
        <p className="text-sm">No form submissions yet.</p>
        <p className="max-w-sm text-xs text-white/30">
          Fill in and send a form in the preview (contact, booking, newsletter...) and it will show up here.
          Sign in to keep them in the cloud and to receive submissions from the deployed site.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs">
        {["all", ...forms].map((f) => (
          <button
            key={f}
            onClick={() => setForm(f)}
            className={`rounded-full px-3 py-1 capitalize ${
              form === f ? "bg-violet-600 text-white" : "bg-white/5 text-white/60 hover:text-white"
            }`}
          >
            {f} {f === "all" ? rows.length : rows.filter((r) => r.form === f).length}
          </button>
        ))}
        <button
          onClick={() => downloadBlob(new Blob([toCsv(shown)], { type: "text/csv" }), `${form}-submissions.csv`)}
          className="ml-auto flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1 text-white/70 hover:bg-white/10"
        >
          <Download size={12} /> CSV
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {shown.map((s) => (
          <div key={s.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/40">
              <span>
                <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5 capitalize text-white/70">{s.form}</span>
                {new Date(s.createdAt).toLocaleString()} &middot; {s.source}
              </span>
              <button
                onClick={async () => {
                  await deleteSubmission(projectId, s);
                  load();
                }}
                title="Delete"
                className="text-white/30 hover:text-red-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-0.5">
              {Object.entries(s.data).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="truncate text-white/40">{k}</dt>
                  <dd className="break-words text-white/85">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
