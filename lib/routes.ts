/** Static page paths of a multi-page site: the <Route path="..."> entries in /App.js (no wildcards or :params). */
export function listRoutes(app: string): string[] {
  const out: string[] = [];
  for (const m of app.matchAll(/<Route\b[^>]*?\bpath=["']([^"']+)["']/g)) {
    const p = m[1];
    if (p.includes("*") || p.includes(":")) continue;
    const path = p.startsWith("/") ? p : "/" + p;
    if (!out.includes(path)) out.push(path);
  }
  if (/<Route\b[^>]*\bindex\b/.test(app) && !out.includes("/")) out.unshift("/");
  return out;
}
