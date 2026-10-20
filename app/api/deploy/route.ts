// Thin proxy to the Vercel REST API (it does not allow browser CORS).
// Uses the OAuth token from the encrypted cookie when the user connected Vercel;
// otherwise a token passed in the request body (forwarded, never stored).
import { getConn, type VercelConn } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 120;

const VERCEL = "https://api.vercel.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export async function POST(req: Request) {
  const body = await req.json();
  const conn = await getConn<VercelConn>("lc_vc");
  const token: string | undefined = conn?.token ?? body.token;
  if (!token) return json({ error: "Not connected to Vercel (no token)" }, 401);
  const team = conn?.teamId ? `&teamId=${encodeURIComponent(conn.teamId)}` : "";

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  if (body.action === "status") {
    const res = await fetch(`${VERCEL}/v13/deployments/${encodeURIComponent(body.id)}?x=1${team}`, { headers });
    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message ?? "Status check failed" }, res.status);
    return json({
      state: data.readyState as string,
      url: (data.alias?.[0] as string | undefined) ?? data.url,
      error: data.errorMessage ?? null,
    });
  }

  // action: "create"
  const files: Record<string, string> = body.files ?? {};
  const name = String(body.name || "app").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
  const res = await fetch(`${VERCEL}/v13/deployments?skipAutoDetectionConfirmation=1${team}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      target: "production",
      files: Object.entries(files).map(([file, data]) => ({ file, data, encoding: "utf-8" })),
      projectSettings: {
        framework: "vite",
        installCommand: "npm install",
        buildCommand: "npm run build",
        outputDirectory: "dist",
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data?.error?.message ?? "Deployment failed to start" }, res.status);
  return json({ id: data.id as string, url: data.url as string, state: data.readyState as string });
}
