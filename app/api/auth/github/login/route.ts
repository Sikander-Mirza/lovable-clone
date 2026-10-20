import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { appOrigin, cookieOpts, safeReturn, seal } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "GITHUB_CLIENT_ID is not configured" }, { status: 400 });

  const ret = safeReturn(new URL(req.url).searchParams.get("return"));
  const state = crypto.randomBytes(16).toString("hex");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appOrigin(req)}/api/auth/github/callback`);
  url.searchParams.set("scope", "repo");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set("lc_state_gh", seal({ state, ret }), { ...cookieOpts, maxAge: 600 });
  return res;
}
