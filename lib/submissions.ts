// Form submissions coming from generated sites (contact, booking, newsletter...).
// Stored in Supabase when the owner is signed in and the table exists, otherwise in
// this browser. Preview submissions are real test data for the builder's Data tab.
import { currentUserId, getSupabase } from "./supabase";

export type Submission = {
  id: string;
  form: string;
  data: Record<string, unknown>;
  createdAt: number;
  source: "local" | "cloud";
};

const key = (projectId: string) => `lovable-clone:submissions:${projectId}`;
const MAX_LOCAL = 500;

function readLocal(projectId: string): Submission[] {
  try {
    return JSON.parse(localStorage.getItem(key(projectId)) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(projectId: string, list: Submission[]) {
  try {
    localStorage.setItem(key(projectId), JSON.stringify(list.slice(-MAX_LOCAL)));
  } catch {}
}

export async function addSubmission(
  projectId: string,
  form: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const sb = getSupabase();
  if (sb && (await currentUserId())) {
    const { error } = await sb.from("submissions").insert({ project_id: projectId, form, data });
    if (!error) return true;
    // Table missing or RLS issue: keep the data locally instead of losing it.
  }
  const list = readLocal(projectId);
  list.push({ id: crypto.randomUUID(), form, data, createdAt: Date.now(), source: "local" });
  writeLocal(projectId, list);
  return true;
}

export async function listSubmissions(projectId: string): Promise<Submission[]> {
  const all: Submission[] = readLocal(projectId);
  const sb = getSupabase();
  if (sb && (await currentUserId())) {
    const { data } = await sb
      .from("submissions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    for (const r of data ?? []) {
      all.push({
        id: r.id,
        form: r.form,
        data: r.data ?? {},
        createdAt: new Date(r.created_at).getTime(),
        source: "cloud",
      });
    }
  }
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSubmission(projectId: string, s: Submission): Promise<void> {
  if (s.source === "cloud") {
    await getSupabase()?.from("submissions").delete().eq("id", s.id);
    return;
  }
  writeLocal(projectId, readLocal(projectId).filter((x) => x.id !== s.id));
}

export function toCsv(rows: Submission[]): string {
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r.data))));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["form", "received", ...cols].map(esc).join(",");
  const body = rows.map((r) =>
    [r.form, new Date(r.createdAt).toISOString(), ...cols.map((c) => r.data[c])].map(esc).join(",")
  );
  return [head, ...body].join("\n");
}
