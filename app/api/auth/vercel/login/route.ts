import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookieOpts, safeReturn, seal } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const slug = process.env.VERCEL_INTEGRATION_SLUG;
  if (!slug || !process.env.VERCEL_CLIENT_ID) {
    return NextResponse.json({ error: "Vercel integration is not configured" }, { status: 400 });
  }

  const ret = safeReturn(new URL(req.url).searchParams.get("return"));
  const state = crypto.randomBytes(16).toString("hex");
  const url = new URL(`https://vercel.com/integrations/${encodeURIComponent(slug)}/new`);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set("lc_state_vc", seal({ state, ret }), { ...cookieOpts, maxAge: 1800 });
  return res;
}
