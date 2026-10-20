// Protects the costly endpoints (the AI proxy) once the app is hosted for others:
//  - a per-IP rate limit (in memory; per server instance, so it is a safety net, not a quota system)
//  - optional "sign in required" mode (REQUIRE_AUTH=true) validated against Supabase
//  - a request size cap
// Locally (no env set) it only applies a generous default rate limit.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const tokenCache = new Map<string, number>(); // access token -> valid-until (ms)

const WINDOW_MS = 60 * 60 * 1000;
const MAX_BODY_BYTES = 4_000_000;

const text = (status: number, msg: string) =>
  new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

/** Returns true when the caller is within the limit (and counts this request). */
export function rateLimitOk(ip: string, limit: number, now = Date.now()): boolean {
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Keep the map from growing forever.
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

async function validSupabaseToken(token: string): Promise<boolean> {
  const hit = tokenCache.get(token);
  if (hit && hit > Date.now()) return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    tokenCache.set(token, Date.now() + 5 * 60 * 1000);
    return true;
  } catch {
    return false;
  }
}

/** Returns a Response to send back when the request must be rejected, otherwise null. */
export async function guardRequest(req: Request): Promise<Response | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) return text(413, "The request is too large. Try fewer or smaller images.");

  if (process.env.REQUIRE_AUTH === "true") {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token || !(await validSupabaseToken(token))) {
      return text(401, "Please sign in to generate. Use the Sign in button on the home page.");
    }
  }

  const limit = Number(process.env.RATE_LIMIT_PER_HOUR) || 120;
  if (!rateLimitOk(clientIp(req), limit)) {
    return text(429, "Too many requests from your network. Please wait a while and try again.");
  }
  return null;
}
