"use client";

import { useEffect, useRef, useState } from "react";
import { Rocket, Loader2, ExternalLink } from "lucide-react";
import { toRepoFiles } from "@/lib/exportProject";

const TOKEN_KEY = "lovable-clone:vercel-token";
const urlKey = (id: string) => `lovable-clone:deploy-url:${id}`;

const read = (k: string) => {
  try {
    return localStorage.getItem(k) || "";
  } catch {
    return "";
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

async function call(payload: Record<string, unknown>) {
  const res = await fetch("/api/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function DeployButton({
  projectId,
  name,
  files,
}: {
  projectId: string;
  name: string;
  files: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState<"idle" | "working" | "done" | "error">("idle");
  const [status, setStatus] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [error, setError] = useState("");
  const cancelled = useRef(false);

  useEffect(() => {
    setToken(read(TOKEN_KEY));
    setLiveUrl(read(urlKey(projectId)));
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, [projectId]);

  const hasFiles = Object.keys(files).length > 0;

  const deploy = async () => {
    setPhase("working");
    setError("");
    setStatus("Uploading...");
    try {
      write(TOKEN_KEY, token.trim());
      const t = token.trim();
      // Stable name per project so redeploys update the same Vercel project.
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "app";
      const created = await call({
        action: "create",
        token: t,
        name: `${slug}-${projectId.slice(0, 6)}`,
        files: toRepoFiles(files, name),
      });

      for (let i = 0; i < 100 && !cancelled.current; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const s = await call({ action: "status", token: t, id: created.id });
        setStatus(s.state === "READY" ? "Ready" : `Building (${s.state.toLowerCase()})...`);
        if (s.state === "READY") {
          const url = `https://${s.url}`;
          write(urlKey(projectId), url);
          setLiveUrl(url);
          setPhase("done");
          return;
        }
        if (s.state === "ERROR" || s.state === "CANCELED") {
          throw new Error(s.error || `Build ${s.state.toLowerCase()}. Check the deployment logs in Vercel.`);
        }
      }
      throw new Error("Timed out waiting for the build.");
    } catch (e: any) {
      setError(e?.message ?? "Deploy failed");
      setPhase("error");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!hasFiles}
        title="Deploy to Vercel"
        className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-40"
      >
        <Rocket size={13} /> Deploy
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-2xl border border-white/15 bg-[#14141c] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Rocket size={18} /> Deploy to Vercel
            </h2>

            <label className="block text-xs text-white/50">
              Vercel token{" "}
              <a
                href="https://vercel.com/account/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-violet-400 hover:underline"
              >
                (create one)
              </a>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              />
              <span className="mt-1 block text-white/30">
                Kept in this browser; sent to Vercel through this app&apos;s server only when you deploy.
              </span>
            </label>

            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 break-all text-sm text-emerald-400 hover:underline"
              >
                {phase === "done" ? "Live:" : "Last deploy:"} {liveUrl} <ExternalLink size={13} />
              </a>
            )}
            {phase === "working" && <p className="text-xs text-white/60">{status}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={deploy}
              disabled={phase === "working" || !token.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-sm font-medium disabled:opacity-50"
            >
              {phase === "working" && <Loader2 size={14} className="animate-spin" />}
              {phase === "working" ? "Deploying..." : liveUrl ? "Redeploy" : "Deploy"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
