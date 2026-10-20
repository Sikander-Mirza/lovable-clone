import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getConn, type GitHubConn, type VercelConn } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const gh = await getConn<GitHubConn>("lc_gh");
  const vc = await getConn<VercelConn>("lc_vc");
  return NextResponse.json({
    github: {
      configured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      connected: !!gh,
      login: gh?.login ?? null,
    },
    vercel: {
      configured: !!(process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET && process.env.VERCEL_INTEGRATION_SLUG),
      connected: !!vc,
    },
  });
}

/** Disconnect: POST { provider: "github" | "vercel" } */
export async function POST(req: Request) {
  const { provider } = await req.json();
  const jar = await cookies();
  if (provider === "github") jar.delete("lc_gh");
  else if (provider === "vercel") jar.delete("lc_vc");
  else return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
