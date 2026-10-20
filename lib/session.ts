// Server-only helpers for OAuth connections. Provider tokens live in encrypted,
// httpOnly cookies (AES-256-GCM), so browser JavaScript never sees them.
import crypto from "node:crypto";
import { cookies } from "next/headers";

export type CookieName = "lc_gh" | "lc_vc";
export type GitHubConn = { token: string; login: string };
export type VercelConn = { token: string; teamId: string | null };

function key(): Buffer {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.GITHUB_CLIENT_SECRET ||
    process.env.VERCEL_CLIENT_SECRET ||
    "dev-only-insecure-secret";
  return crypto.createHash("sha256").update(secret).digest();
}

export function seal(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64url");
}

export function unseal<T>(sealed: string | undefined): T | null {
  if (!sealed) return null;
  try {
    const buf = Buffer.from(sealed, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const dec = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
    return JSON.parse(dec.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function getConn<T>(name: CookieName): Promise<T | null> {
  const jar = await cookies();
  return unseal<T>(jar.get(name)?.value);
}

/** Only allow same-site relative return paths. */
export function safeReturn(p: string | null): string {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/";
}

export function appOrigin(req: Request): string {
  return (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
}
