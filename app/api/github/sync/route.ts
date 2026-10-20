import { NextResponse } from "next/server";
import { syncToGitHub } from "@/lib/github";
import { getConn, type GitHubConn } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 120;

// Pushes files using the OAuth token from the encrypted cookie.
export async function POST(req: Request) {
  const conn = await getConn<GitHubConn>("lc_gh");
  if (!conn) return NextResponse.json({ error: "Not connected to GitHub" }, { status: 401 });
  const body = await req.json();
  try {
    const result = await syncToGitHub({
      token: conn.token,
      repo: String(body.repo ?? ""),
      files: body.files ?? {},
      message: String(body.message ?? "Update from lovable-clone"),
      createIfMissing: !!body.createIfMissing,
      isPrivate: body.isPrivate !== false,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Sync failed" }, { status: 400 });
  }
}

/** Repo suggestions for the connected account. */
export async function GET() {
  const conn = await getConn<GitHubConn>("lc_gh");
  if (!conn) return NextResponse.json({ repos: [] });
  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator",
    { headers: { Authorization: `Bearer ${conn.token}`, Accept: "application/vnd.github+json" } }
  );
  const data = res.ok ? await res.json() : [];
  return NextResponse.json({ repos: (data as { full_name: string }[]).map((r) => r.full_name) });
}
