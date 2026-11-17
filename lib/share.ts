// Read-only share links. A share is a snapshot of the project's files stored in the Supabase
// "shares" table (see supabase/schema.sql); /s/<id> renders it for anyone with the link.
import { currentUserId, getSupabase } from "./supabase";
import type { Project } from "./store";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A random, unguessable 10-character id. */
export function newShareId(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return Array.from(rand(10), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const shareUrl = (origin: string, id: string) => `${origin.replace(/\/$/, "")}/s/${id}`;

export const validShareId = (id: string) => /^[a-z0-9]{10}$/.test(id);

export type ShareState =
  | { status: "unavailable"; reason: string } // Supabase missing, not signed in, or table not created
  | { status: "none" }
  | { status: "shared"; id: string; updatedAt: number };

const TABLE_HINT = "Run the new 'shares' section of supabase/schema.sql in the Supabase SQL editor first.";

export async function getShareState(projectId: string): Promise<ShareState> {
  const sb = getSupabase();
  if (!sb) return { status: "unavailable", reason: "Sharing needs Supabase (see the README)." };
  if (!(await currentUserId())) return { status: "unavailable", reason: "Sign in to share this project." };
  const { data, error } = await sb.from("shares").select("id, updated_at").eq("project_id", projectId).maybeSingle();
  if (error) return { status: "unavailable", reason: TABLE_HINT };
  return data ? { status: "shared", id: data.id, updatedAt: Date.parse(data.updated_at) } : { status: "none" };
}

/** Creates the share, or refreshes the snapshot of an existing one (the link stays the same). */
export async function publishShare(p: Project, existingId?: string): Promise<ShareState> {
  const sb = getSupabase();
  const uid = await currentUserId();
  if (!sb || !uid) return { status: "unavailable", reason: "Sign in to share this project." };
  const id = existingId ?? newShareId();
  const row = { id, project_id: p.id, user_id: uid, name: p.name, files: p.files, updated_at: new Date().toISOString() };
  const { error } = await sb.from("shares").upsert(row, { onConflict: "project_id" });
  if (error) return { status: "unavailable", reason: error.message.includes("shares") ? TABLE_HINT : error.message };
  return { status: "shared", id, updatedAt: Date.now() };
}

export async function stopSharing(projectId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("shares").delete().eq("project_id", projectId);
  return !error;
}

export type PublicShare = { projectId: string; name: string; files: Record<string, string> };

/** Used by the public page; works without signing in. */
export async function loadShare(id: string): Promise<PublicShare | null> {
  const sb = getSupabase();
  if (!sb || !validShareId(id)) return null;
  const { data, error } = await sb.rpc("get_share", { share_id: id });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return { projectId: row.project_id, name: row.name, files: row.files ?? {} };
}
