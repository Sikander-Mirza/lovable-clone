"use client";

import { useEffect, useState } from "react";
import { Github, Loader2, ExternalLink } from "lucide-react";
import { syncToGitHub } from "@/lib/github";
import { toRepoFiles } from "@/lib/exportProject";

const TOKEN_KEY = "lovable-clone:gh-token";
const repoKey = (id: string) => `lovable-clone:gh-repo:${id}`;

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

export default function GitHubSync({
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
  const [repo, setRepo] = useState("");
  const [create, setCreate] = useState(true);
  const [priv, setPriv] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; created: boolean } | null>(null);

  useEffect(() => {
    setToken(read(TOKEN_KEY));
    setRepo(read(repoKey(projectId)));
  }, [projectId]);

  const hasFiles = Object.keys(files).length > 0;

  const push = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      write(TOKEN_KEY, token.trim());
      write(repoKey(projectId), repo.trim());
      const r = await syncToGitHub({
        token: token.trim(),
        repo,
        files: toRepoFiles(files, name),
        message: `Update from lovable-clone (${new Date().toISOString().slice(0, 16).replace("T", " ")})`,
        createIfMissing: create,
        isPrivate: priv,
      });
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!hasFiles}
        title="Push to GitHub"
        className="flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 disabled:opacity-40"
      >
        <Github size={13} /> GitHub
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
              <Github size={18} /> Push to GitHub
            </h2>

            <label className="block text-xs text-white/50">
              Repository (owner/name)
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="your-username/my-app"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              />
            </label>

            <label className="block text-xs text-white/50">
              Personal access token{" "}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=lovable-clone"
                target="_blank"
                rel="noreferrer"
                className="text-violet-400 hover:underline"
              >
                (create one, scope: repo)
              </a>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              />
              <span className="mt-1 block text-white/30">Stored only in this browser.</span>
            </label>

            <div className="flex gap-4 text-xs text-white/60">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={create} onChange={(e) => setCreate(e.target.checked)} />
                Create if missing
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
                Private
              </label>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            {result && (
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline"
              >
                {result.created ? "Repo created and pushed" : "Pushed"} <ExternalLink size={13} />
              </a>
            )}

            <button
              onClick={push}
              disabled={busy || !token.trim() || !repo.includes("/")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {busy ? "Pushing..." : "Push"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
