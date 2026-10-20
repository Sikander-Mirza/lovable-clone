import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appOrigin, cookieOpts, seal, unseal } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOrigin(req);
  const jar = await cookies();
  const saved = unseal<{ state: string; ret: string }>(jar.get("lc_state_vc")?.value);
  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}${saved?.ret ?? "/"}?connect_error=${encodeURIComponent(msg)}`);

  const code = url.searchParams.get("code");
  if (!code) return fail("Vercel did not return an authorization code");
  // The state we sent comes back on the redirect when Vercel preserves it; verify when present.
  const returned = url.searchParams.get("state");
  if (returned && saved && returned !== saved.state) return fail("Invalid OAuth state, please try again");

  const tokenRes = await fetch("https://api.vercel.com/v2/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.VERCEL_CLIENT_ID ?? "",
      client_secret: process.env.VERCEL_CLIENT_SECRET ?? "",
      code,
      redirect_uri: `${origin}/api/auth/vercel/callback`,
    }),
  });
  const data = await tokenRes.json();
  if (!data.access_token) return fail(data.error_description || data.error?.message || "Could not get a Vercel token");

  const teamId = url.searchParams.get("teamId") || data.team_id || null;
  const res = NextResponse.redirect(`${origin}${saved?.ret ?? "/"}`);
  res.cookies.set("lc_vc", seal({ token: data.access_token, teamId }), cookieOpts);
  res.cookies.delete("lc_state_vc");
  return res;
}
