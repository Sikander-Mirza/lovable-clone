// Topic-matched photos. The static library (lib/photos.ts) has about 50 photos, so a photographer's
// or a fashion brand's site ends up with handshakes and laptops. When UNSPLASH_ACCESS_KEY is set,
// new sites (and requests that mention photos) first get a few real Unsplash photos found for
// their exact subject, and the model is told to use those before the general library.

export type MatchedPhoto = { path: string; alt: string; shape: "landscape" | "portrait" | "square" };
export type PhotoGroup = { query: string; photos: MatchedPhoto[] };

/** Requests written by the app itself never need new photos. */
const SKIP_PREFIXES = [
  "The preview crashed",
  "Automatic checks found",
  "The build does not match",
  "Your first version is too thin",
  "Do a visual design review",
];

export function wantsPhotos(files: Record<string, string>, request: string): boolean {
  if (SKIP_PREFIXES.some((p) => request.startsWith(p))) return false;
  if (Object.keys(files).length === 0) return true; // a new project
  return /\b(photos?|images?|pictures?|gallery|hero|banner|portraits?|backgrounds?)\b/i.test(request);
}

/** Pulls 1 to 4 short search queries out of the model's reply (a JSON array, possibly wrapped in prose). */
export function parseQueries(raw: string): string[] {
  const a = raw.indexOf("[");
  const b = raw.lastIndexOf("]");
  if (a < 0 || b <= a) return [];
  try {
    const list = JSON.parse(raw.slice(a, b + 1));
    if (!Array.isArray(list)) return [];
    const out = list
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.replace(/\s+/g, " ").trim().slice(0, 60))
      .filter((q) => q.length >= 2);
    return Array.from(new Set(out)).slice(0, 4);
  } catch {
    return [];
  }
}

/** One Unsplash API result as a photo, or null for paid/unusable ones. */
export function toPhoto(r: any): MatchedPhoto | null {
  try {
    const path = new URL(String(r?.urls?.raw)).pathname.replace(/^\//, "");
    if (!/^photo-[0-9a-z-]+$/i.test(path)) return null; // skips premium_photo-... and anything odd
    const alt = String(r?.alt_description || r?.description || "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!alt) return null;
    const w = Number(r?.width) || 0;
    const h = Number(r?.height) || 0;
    const shape = w && h && Math.abs(w - h) / Math.max(w, h) < 0.1 ? "square" : h > w ? "portrait" : "landscape";
    return { path, alt, shape };
  } catch {
    return null;
  }
}

const cache = new Map<string, { at: number; photos: MatchedPhoto[] }>();
const TTL_MS = 60 * 60 * 1000;

/** Searches Unsplash (50 requests per hour on the free tier, so results are cached for an hour). */
export async function searchPhotos(
  query: string,
  key: string,
  perPage = 8,
  fetcher: typeof fetch = fetch
): Promise<MatchedPhoto[]> {
  const hit = cache.get(query.toLowerCase());
  if (hit && Date.now() - hit.at < TTL_MS) return hit.photos;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&content_filter=high`;
  const res = await fetcher(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" } });
  if (!res.ok) throw new Error(`Unsplash ${res.status}`);
  const data = await res.json();
  const photos = (Array.isArray(data?.results) ? data.results : []).map(toPhoto).filter((p: MatchedPhoto | null): p is MatchedPhoto => !!p);
  cache.set(query.toLowerCase(), { at: Date.now(), photos });
  return photos;
}

/** The text added to the user's turn: every photo once, grouped by the query that found it. */
export function photosBlock(groups: PhotoGroup[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const g of groups) {
    const fresh = g.photos.filter((p) => !seen.has(p.path));
    fresh.forEach((p) => seen.add(p.path));
    if (!fresh.length) continue;
    lines.push(`- ${g.query}:`);
    for (const p of fresh) lines.push(`  ${p.path} (${p.shape}): ${p.alt}`);
  }
  if (!lines.length) return "";
  return [
    "Matched photos: real photos found for this exact request. Use these FIRST for the hero, galleries, cards and about sections, and use the general library only for subjects they do not cover.",
    "Build each URL as https://images.unsplash.com/<id>?auto=format&fit=crop&w=<width>&q=70 (the id is the part that starts with photo-). Pick portrait photos for tall cards and landscape ones for wide areas, and match the alt text to what the photo shows.",
    ...lines,
  ].join("\n");
}

export const QUERY_SYSTEM = `You pick stock-photo search queries for a website that is about to be built.
Reply with ONLY a JSON array of 2 to 4 short English search queries (2 to 4 words each) for Unsplash photos that fit this site's real subject (what it sells or shows), not generic business clichés. Cover different needs, for example a wide hero scene, close-up detail shots, and people if the site needs them.
If the request is a small tool or app that needs no photos (counter, calculator, to-do, dashboard...) reply with [].`;

/** Everything in one call: ask the model for queries, search, format. Returns "" when nothing was found. */
export async function matchedPhotos(
  request: string,
  key: string,
  ask: (system: string, user: string) => Promise<string>
): Promise<string> {
  const queries = parseQueries(await ask(QUERY_SYSTEM, request.slice(0, 2500)));
  if (!queries.length) return "";
  const groups = await Promise.all(
    queries.map(async (query) => ({ query, photos: await searchPhotos(query, key).catch(() => [] as MatchedPhoto[]) }))
  );
  return photosBlock(groups);
}
