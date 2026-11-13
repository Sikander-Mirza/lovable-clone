// Site-level settings that are not part of the generated code: SEO tags and a WhatsApp
// chat button. They live in /site.json in the project (so they are versioned, undoable and
// exported) and are injected into the preview document and the exported index.html.

export type Seo = {
  title: string;
  description: string;
  /** Absolute URL of the social share image (Open Graph / Twitter). */
  image: string;
  /** Public address of the site, used for the canonical link and og:url. */
  url: string;
  /** Primary language code for <html lang>, e.g. "en", "ur". */
  lang: string;
};

export type WhatsApp = {
  enabled: boolean;
  /** Digits only, with country code, e.g. 923001234567. */
  number: string;
  /** Pre-filled first message. */
  message: string;
};

export type SiteSettings = { seo: Seo; whatsapp: WhatsApp };

export const SITE_PATH = "/site.json";

export const DEFAULT_SITE: SiteSettings = {
  seo: { title: "", description: "", image: "", url: "", lang: "en" },
  whatsapp: { enabled: false, number: "", message: "Hello! I found you on your website." },
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const httpUrl = (v: unknown) => {
  const s = str(v, 500);
  return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : "";
};

export function parseSite(files: Record<string, string>): SiteSettings {
  let d: any = {};
  try {
    d = JSON.parse(files[SITE_PATH] ?? "{}");
  } catch {}
  const lang = str(d?.seo?.lang, 12);
  return {
    seo: {
      title: str(d?.seo?.title, 70),
      description: str(d?.seo?.description, 200),
      image: httpUrl(d?.seo?.image),
      url: httpUrl(d?.seo?.url),
      lang: /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(lang) ? lang : "en",
    },
    whatsapp: {
      enabled: !!d?.whatsapp?.enabled,
      number: str(d?.whatsapp?.number, 20).replace(/\D/g, ""),
      message: str(d?.whatsapp?.message, 300) || DEFAULT_SITE.whatsapp.message,
    },
  };
}

export const serializeSite = (s: SiteSettings) => JSON.stringify(s, null, 2);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** <meta>/<link> tags for the document head. `fallbackTitle` is used when no title is set. */
export function seoTags(seo: Seo, fallbackTitle: string): string {
  const title = seo.title || fallbackTitle;
  const out = [`<title>${esc(title)}</title>`];
  if (seo.description) out.push(`<meta name="description" content="${esc(seo.description)}" />`);
  if (seo.url) out.push(`<link rel="canonical" href="${esc(seo.url)}" />`);
  out.push(`<meta property="og:type" content="website" />`, `<meta property="og:title" content="${esc(title)}" />`);
  if (seo.description) out.push(`<meta property="og:description" content="${esc(seo.description)}" />`);
  if (seo.url) out.push(`<meta property="og:url" content="${esc(seo.url)}" />`);
  if (seo.image) out.push(`<meta property="og:image" content="${esc(seo.image)}" />`);
  out.push(`<meta name="twitter:card" content="${seo.image ? "summary_large_image" : "summary"}" />`);
  return out.join("\n    ");
}

export function whatsappHref(w: WhatsApp): string {
  return `https://wa.me/${w.number}?text=${encodeURIComponent(w.message)}`;
}

/** A floating chat button (plain HTML+CSS so it works in the preview and in the exported site). */
export function whatsappWidget(w: WhatsApp): string {
  if (!w.enabled || w.number.length < 7) return "";
  return `<a href="${esc(whatsappHref(w))}" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" title="Chat on WhatsApp"
  style="position:fixed;right:18px;bottom:18px;z-index:2147483000;width:56px;height:56px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.28)">
  <svg viewBox="0 0 32 32" width="30" height="30" fill="#fff" aria-hidden="true"><path d="M16.01 3C9.38 3 4 8.37 4 15c0 2.35.68 4.55 1.86 6.4L4 29l7.8-1.83A12 12 0 0 0 16.01 27C22.63 27 28 21.63 28 15S22.64 3 16.01 3zm0 21.9c-1.86 0-3.6-.5-5.1-1.38l-.37-.22-4.63 1.09 1.14-4.5-.24-.4A9.84 9.84 0 0 1 6.1 15c0-5.46 4.45-9.9 9.91-9.9S25.9 9.54 25.9 15s-4.44 9.9-9.89 9.9zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/></svg>
</a>`;
}

// Right-to-left languages: the page direction and a font that has the script.
const SCRIPT_FONTS: Record<string, string> = {
  ur: "Noto Nastaliq Urdu",
  ar: "Noto Sans Arabic",
  fa: "Noto Sans Arabic",
  he: "Noto Sans Hebrew",
  hi: "Noto Sans Devanagari",
};

export const isRtl = (lang: string) => ["ur", "ar", "fa", "he"].includes(lang.slice(0, 2));

/** Attributes for the <html> tag, e.g. `lang="ur" dir="rtl"`. */
export const htmlAttrs = (lang: string) => `lang="${lang}"${isRtl(lang) ? ' dir="rtl"' : ""}`;

/** <link> for the script font of the page language ("" for Latin-script languages). */
export function scriptFontLink(lang: string): string {
  const f = SCRIPT_FONTS[lang.slice(0, 2)];
  return f ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${f.replace(/ /g, "+")}:wght@400;500;600;700&display=swap" />` : "";
}

/** CSS that makes every element use the script font (Tailwind font classes would otherwise win). */
export function scriptFontCss(lang: string): string {
  const f = SCRIPT_FONTS[lang.slice(0, 2)];
  if (!f) return "";
  const lh = lang.startsWith("ur") ? "html[lang^=ur] body{line-height:2}" : "";
  return `html[lang^=${lang.slice(0, 2)}] body,html[lang^=${lang.slice(0, 2)}] body *{font-family:'${f}',ui-sans-serif,system-ui,sans-serif !important}${lh}`;
}
