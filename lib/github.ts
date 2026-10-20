// Minimal GitHub client: commits a set of files to a repo in a single commit
// using the Git Data API. Runs in the browser; the token never touches our server.

const API = "https://api.github.com";

async function gh<T = any>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).message || msg;
    } catch {}
    const err = new Error(`GitHub ${res.status}: ${msg}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

export type SyncResult = { url: string; commitSha: string; created: boolean };

export async function syncToGitHub(opts: {
  token: string;
  repo: string; // "owner/name"
  files: Record<string, string>;
  message: string;
  createIfMissing: boolean;
  isPrivate: boolean;
}): Promise<SyncResult> {
  const { token, files, message } = opts;
  const [owner, name] = opts.repo.trim().split("/");
  if (!owner || !name) throw new Error('Repository must look like "owner/name".');

  // 1. Find or create the repo.
  let created = false;
  let repo: any;
  try {
    repo = await gh(token, `/repos/${owner}/${name}`);
  } catch (e: any) {
    if (e.status !== 404 || !opts.createIfMissing) {
      throw e.status === 404
        ? new Error(`Repo ${owner}/${name} not found. Tick "Create if missing" or check the name.`)
        : e;
    }
    const me = await gh(token, "/user");
    const path = me.login.toLowerCase() === owner.toLowerCase() ? "/user/repos" : `/orgs/${owner}/repos`;
    repo = await gh(token, path, {
      method: "POST",
      body: JSON.stringify({ name, private: opts.isPrivate, auto_init: true }),
    });
    created = true;
  }
  const branch: string = repo.default_branch || "main";

  // 2. Current head commit. An empty repo has no ref yet: seed it via the Contents API.
  const getHead = () => gh<any>(token, `/repos/${owner}/${name}/git/ref/heads/${branch}`);
  let head: any;
  try {
    head = await getHead();
  } catch (e: any) {
    if (e.status !== 404 && e.status !== 409) throw e;
    await gh(token, `/repos/${owner}/${name}/contents/.gitkeep`, {
      method: "PUT",
      body: JSON.stringify({ message: "Initialize repository", content: b64(""), branch }),
    });
    head = await getHead();
  }
  const parentSha: string = head.object.sha;
  const parent = await gh<any>(token, `/repos/${owner}/${name}/git/commits/${parentSha}`);

  // 3. Blobs -> tree -> commit -> move the branch.
  const entries = await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const blob = await gh<any>(token, `/repos/${owner}/${name}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: b64(content), encoding: "base64" }),
      });
      return { path, mode: "100644", type: "blob", sha: blob.sha };
    })
  );
  const tree = await gh<any>(token, `/repos/${owner}/${name}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: parent.tree.sha, tree: entries }),
  });
  const commit = await gh<any>(token, `/repos/${owner}/${name}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
  });
  await gh(token, `/repos/${owner}/${name}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });

  return { url: repo.html_url, commitSha: commit.sha, created };
}
