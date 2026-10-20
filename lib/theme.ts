// Project-wide design tokens. They live in the project as /theme.json so they are
// part of every version, undo step and export. Generated code uses the `brand`
// color scale and the font families (`font-sans`, `font-display`), so changing the
// theme restyles the whole site at once.

export type Theme = {
  /** Main accent color (the 600 shade of the `brand` scale). */
  brand: string;
  /** Body font (Google Fonts family name). */
  font: string;
  /** Heading font (`font-display`). */
  headingFont: string;
};

export const THEME_PATH = "/theme.json";

export const DEFAULT_THEME: Theme = { brand: "#4f46e5", font: "Inter", headingFont: "Inter" };

export const FONTS = [
  "Inter",
  "Poppins",
  "DM Sans",
  "Montserrat",
  "Nunito",
  "Space Grotesk",
  "Playfair Display",
  "Merriweather",
  "Cairo",
  "Noto Nastaliq Urdu",
] as const;

export const BRAND_PRESETS = ["#4f46e5", "#2563eb", "#0891b2", "#059669", "#d97706", "#dc2626", "#db2777", "#7c3aed", "#111827"];

const isHex = (s: unknown): s is string => typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);

export function parseTheme(files: Record<string, string>): Theme {
  try {
    const t = JSON.parse(files[THEME_PATH] ?? "{}");
    const font = FONTS.includes(t.font) ? t.font : DEFAULT_THEME.font;
    return {
      brand: isHex(t.brand) ? t.brand.toLowerCase() : DEFAULT_THEME.brand,
      font,
      headingFont: FONTS.includes(t.headingFont) ? t.headingFont : font,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

export const serializeTheme = (t: Theme) => JSON.stringify(t, null, 2);

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/** Tailwind-style 50..950 scale where the given color is the 600 shade. */
export function brandScale(hex: string): Record<string, string> {
  const [h, s, l] = hexToHsl(hex);
  const clamp = (n: number) => Math.max(4, Math.min(98, n));
  const ladder: Record<string, number> = {
    "50": 97, "100": 94, "200": 87, "300": 77, "400": 66, "500": clamp((66 + l) / 2 + 2),
    "600": l, "700": clamp(l - 8), "800": clamp(l - 16), "900": clamp(l - 24), "950": clamp(l - 33),
  };
  const out: Record<string, string> = {};
  for (const [shade, lightness] of Object.entries(ladder)) {
    // Very light shades look washed out at full saturation.
    const sat = Number(shade) < 300 ? Math.min(s, 95) * 0.9 : s;
    out[shade] = hslToHex(h, sat, lightness);
  }
  return out;
}

const q = (f: string) => `'${f}', ui-sans-serif, system-ui, sans-serif`;

/** JS expression for tailwind.config (Play CDN and the exported tailwind.config.js). */
export function tailwindConfig(t: Theme) {
  return {
    theme: {
      extend: {
        colors: { brand: brandScale(t.brand) },
        fontFamily: { sans: [q(t.font)], display: [q(t.headingFont)] },
      },
    },
  };
}

export function fontsHref(t: Theme): string {
  const fams = Array.from(new Set([t.font, t.headingFont]))
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${fams}&display=swap`;
}
