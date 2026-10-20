import { currentUserId, getSupabase } from "./supabase";

export type Message = {
  role: "user" | "assistant";
  content: string;
  /** Attached images as (downscaled) data URLs; user messages only. */
  images?: string[];
  /** Full project files right after this assistant reply: powers version history. */
  snapshot?: Record<string, string>;
};

export type Project = {
  id: string;
  name: string;
  messages: Message[];
  files: Record<string, string>;
  updatedAt: number;
};

// Storage backend: Supabase when signed in, otherwise localStorage.

const KEY = "lovable-clone:projects";

function readLocal(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(list: Project[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

type Row = {
  id: string;
  name: string;
  messages: Message[];
  files: Record<string, string>;
  updated_at: string;
};

const fromRow = (r: Row): Project => ({
  id: r.id,
  name: r.name,
  messages: r.messages,
  files: r.files,
  updatedAt: new Date(r.updated_at).getTime(),
});

export async function listProjects(): Promise<Project[]> {
  const sb = getSupabase();
  if (sb && (await currentUserId())) {
    const { data } = await sb.from("projects").select("*").order("updated_at", { ascending: false });
    return (data ?? []).map(fromRow);
  }
  return readLocal().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const sb = getSupabase();
  if (sb && (await currentUserId())) {
    const { data } = await sb.from("projects").select("*").eq("id", id).maybeSingle();
    return data ? fromRow(data) : undefined;
  }
  return readLocal().find((p) => p.id === id);
}

export async function saveProject(p: Project): Promise<void> {
  const sb = getSupabase();
  const uid = await currentUserId();
  if (sb && uid) {
    await sb.from("projects").upsert({
      id: p.id,
      user_id: uid,
      name: p.name,
      messages: p.messages,
      files: p.files,
      updated_at: new Date().toISOString(),
    });
    return;
  }
  const list = readLocal().filter((x) => x.id !== p.id);
  list.push({ ...p, updatedAt: Date.now() });
  writeLocal(list);
}

export async function deleteProject(id: string): Promise<void> {
  const sb = getSupabase();
  if (sb && (await currentUserId())) {
    await sb.from("projects").delete().eq("id", id);
    return;
  }
  writeLocal(readLocal().filter((p) => p.id !== id));
}

export async function createProject(prompt: string, images: string[] = []): Promise<Project> {
  const text = prompt || "Recreate the attached design.";
  const p: Project = {
    id: crypto.randomUUID(),
    name: text.slice(0, 40) || "Untitled",
    messages: [{ role: "user", content: text, ...(images.length ? { images } : {}) }],
    files: {},
    updatedAt: Date.now(),
  };
  await saveProject(p);
  return p;
}

/** Copy browser-only projects into the signed-in account. Returns how many were moved. */
export async function importLocalProjects(): Promise<number> {
  const local = readLocal();
  for (const p of local) await saveProject(p);
  if (local.length) writeLocal([]);
  return local.length;
}

export const localProjectCount = () => readLocal().length;
