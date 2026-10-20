import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appOrigin, cookieOpts, seal, unseal } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOrigin(req);
  const jar = await cookies();
  const saved = unseal<{ state: string; ret: string }>(jar.get("lc_state_gh")?.value);
  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}${saved?.ret ?? "/"}?connect_error=${encodeURIComponent(msg)}`);

  const code = url.searchParams.get("code");
  if (url.searchParams.get("error")) return fail(url.searchParams.get("error_description") || "GitHub denied access");
  if (!code || !saved || url.searchParams.get("state") !== saved.state) return fail("Invalid OAuth state, please try again");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${origin}/api/auth/github/callback`,
    }),
  });
  const data = await tokenRes.json();
  if (!data.access_token) return fail(data.error_description || "Could not get a GitHub token");

  const me = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${data.access_token}`, Accept: "application/vnd.github+json" },
  }).then((r) => r.json());

  const res = NextResponse.redirect(`${origin}${saved.ret}`);
  res.cookies.set("lc_gh", seal({ token: data.access_token, login: me.login ?? "" }), cookieOpts);
  res.cookies.delete("lc_state_gh");
  return res;
}
