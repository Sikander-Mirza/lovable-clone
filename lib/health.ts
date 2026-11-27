// Site health report: SEO, accessibility, mobile and speed. Static checks come from the
// project files; live measurements (headings, image alt text, labels, sideways scrolling)
// are taken from the running preview. No external service is involved.
import { parseSite } from "./site";
import { parseTheme } from "./theme";

export type Status = "pass" | "warn" | "fail" | "skip";
export type Group = "SEO" | "Accessibility" | "Mobile" | "Speed";
export type Check = { id: string; group: Group; label: string; status: Status; detail?: string; fix?: string };

/** Measurements the preview reports about its own DOM. */
export type Probe = {
  h1Count: number;
  headingSkips: number; // jumps such as h2 -> h4
  imgsTotal: number;
  imgsNoAlt: number;
  buttonsNoName: number;
  inputsNoLabel: number;
  scrollWidth: number;
  clientWidth: number;
  /** Elements sticking out past the left or right screen edge (see probe() in lib/previewDoc.ts). */
  cutOff?: { tag: string; cls: string; text: string; left: number; right: number }[];
  /** Grids that define columns but have a single child holding all the items, so everything stacks in one cell. */
  lonelyGrids?: { cls: string; cols: number; items: number }[];
  /** On wide screens: sections whose content huddles on one side and leaves the other empty. */
  emptySides?: { title: string; side: "left" | "right"; usedPercent: number }[];
  /** On wide screens: a grid row that leaves a hole because its cards do not add up to the grid's width. */
  raggedRows?: { cls: string; row: number; emptyPx: number }[];
  /** Images that do not load (a missing file, an empty src). */
  brokenImages?: { src: string; alt: string }[];
};

// ----------------------------------------------------------- contrast

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

/** WCAG contrast ratio between two #rrggbb colors. */
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// ----------------------------------------------------------- static checks

export function staticChecks(files: Record<string, string>): Check[] {
  const out: Check[] = [];
  const site = parseSite(files);
  const theme = parseTheme(files);
  const code = Object.entries(files)
    .filter(([p]) => /\.jsx?$/.test(p))
    .map(([, c]) => c)
    .join("\n");

  // SEO (site settings)
  const t = site.seo.title.length;
  out.push({
    id: "seo-title", group: "SEO", label: "Page title",
    status: t === 0 ? "fail" : t >= 15 && t <= 60 ? "pass" : "warn",
    detail: t === 0 ? "No title is set" : `${t} characters (15 to 60 works best on Google)`,
    fix: 'Write a clear page title of 30 to 60 characters (business name plus what it offers) in /site.json seo.title.',
  });
  const d = site.seo.description.length;
  out.push({
    id: "seo-description", group: "SEO", label: "Meta description",
    status: d === 0 ? "fail" : d >= 70 && d <= 160 ? "pass" : "warn",
    detail: d === 0 ? "No description is set" : `${d} characters (70 to 160 works best)`,
    fix: "Write a meta description of 100 to 155 characters in /site.json seo.description.",
  });
  out.push({
    id: "seo-image", group: "SEO", label: "Social share image",
    status: site.seo.image ? "pass" : "warn",
    detail: site.seo.image ? undefined : "Links shared on WhatsApp and social media show no picture",
    fix: "Set /site.json seo.image to a full https URL of a relevant photo from the approved photo library.",
  });

  // Accessibility (static)
  const brand600 = theme.brand;
  const ratio = contrast(brand600, "#ffffff");
  out.push({
    id: "a11y-contrast", group: "Accessibility", label: "Brand color contrast with white text",
    status: ratio >= 4.5 ? "pass" : ratio >= 3 ? "warn" : "fail",
    detail: `${ratio.toFixed(1)}:1 (4.5:1 is the WCAG minimum for normal text)`,
    fix: "Darken the brand color in /theme.json so white text on bg-brand-600 buttons reaches a 4.5:1 contrast ratio, keeping the same hue.",
  });

  // Mobile (static)
  const responsive = (code.match(/\b(?:sm|md|lg|xl):[a-z-]/g) ?? []).length;
  out.push({
    id: "mobile-responsive", group: "Mobile", label: "Responsive layout classes",
    status: responsive >= 8 ? "pass" : responsive >= 3 ? "warn" : "fail",
    detail: `${responsive} responsive (sm:/md:/lg:) classes in the code`,
    fix: "Make every section responsive: stack columns on small screens, scale type and spacing with sm:/md:/lg: classes, and add a mobile navigation menu.",
  });
  const wide = [...code.matchAll(/\b(?:min-)?w-\[(\d{3,4})px\]/g)].filter((m) => Number(m[1]) > 420).length;
  out.push({
    id: "mobile-fixed-width", group: "Mobile", label: "No fixed wide elements",
    status: wide === 0 ? "pass" : "warn",
    detail: wide ? `${wide} element(s) have a fixed width above 420px` : undefined,
    fix: "Replace fixed pixel widths above 420px with max-w-* and w-full so nothing forces sideways scrolling on phones.",
  });

  // Speed (static)
  const imgs = [...code.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  if (imgs.length) {
    const lazy = imgs.filter((i) => /loading=["']lazy["']/.test(i)).length;
    out.push({
      id: "speed-lazy", group: "Speed", label: "Images load lazily",
      status: lazy / imgs.length >= 0.7 ? "pass" : lazy ? "warn" : "fail",
      detail: `${lazy} of ${imgs.length} images use loading="lazy"`,
      fix: 'Add loading="lazy" to every <img> except the first screen\'s hero image.',
    });
  }
  const bigPhotos = [...code.matchAll(/images\.unsplash\.com\/[^"'`\s]*[?&]w=(\d{3,5})/g)].filter((m) => Number(m[1]) > 1600).length;
  out.push({
    id: "speed-photo-size", group: "Speed", label: "Photo sizes",
    status: bigPhotos === 0 ? "pass" : "warn",
    detail: bigPhotos ? `${bigPhotos} photo URL(s) request more than 1600px width` : undefined,
    fix: "Request photos at w=1200 or smaller (w=600 for cards and avatars) in the Unsplash URLs.",
  });
  const kb = Math.round(code.length / 1000);
  out.push({
    id: "speed-size", group: "Speed", label: "Amount of code",
    status: kb <= 150 ? "pass" : kb <= 300 ? "warn" : "fail",
    detail: `${kb} KB of source`,
  });
  return out;
}

// ----------------------------------------------------------- live checks

export function describeBroken(b: NonNullable<Probe["brokenImages"]>[number]): string {
  return `"${b.alt || "no alt text"}" (src ${b.src ? b.src : "is empty"})`;
}

/** One element that sticks out past the screen edge, as a short readable line. */
export function describeCutOff(c: NonNullable<Probe["cutOff"]>[number]): string {
  const cls = c.cls ? ` class="${c.cls}"` : "";
  const text = c.text ? ` "${c.text}"` : "";
  return `<${c.tag}${cls}>${text} (left edge ${c.left}px, right edge ${c.right}px)`;
}

export function probeChecks(p: Probe): Check[] {
  const checks: Check[] = [
    {
      id: "seo-h1", group: "SEO", label: "One main heading (h1)",
      status: p.h1Count === 1 ? "pass" : "fail",
      detail: p.h1Count === 1 ? undefined : p.h1Count === 0 ? "The page has no h1" : `${p.h1Count} h1 headings (use exactly one)`,
      fix: "Make sure the page has exactly one <h1> (the hero headline); use <h2> for section titles.",
    },
    {
      id: "a11y-heading-order", group: "Accessibility", label: "Heading order",
      status: p.headingSkips === 0 ? "pass" : "warn",
      detail: p.headingSkips ? `${p.headingSkips} place(s) skip a heading level` : undefined,
      fix: "Fix the heading hierarchy: never jump from h2 to h4; nest h3 under h2.",
    },
    {
      id: "a11y-alt", group: "Accessibility", label: "Images have alt text",
      status: p.imgsNoAlt === 0 ? "pass" : "fail",
      detail: p.imgsTotal ? `${p.imgsTotal - p.imgsNoAlt} of ${p.imgsTotal} images have alt text` : "No images on the page",
      fix: 'Add a meaningful alt="..." to every <img> (alt="" only for purely decorative ones).',
    },
    {
      id: "a11y-buttons", group: "Accessibility", label: "Buttons and links have names",
      status: p.buttonsNoName === 0 ? "pass" : "fail",
      detail: p.buttonsNoName ? `${p.buttonsNoName} icon-only button(s) or link(s) have no accessible name` : undefined,
      fix: "Add aria-label to every icon-only button and link (menu, search, cart, social icons).",
    },
    {
      id: "a11y-labels", group: "Accessibility", label: "Form fields have labels",
      status: p.inputsNoLabel === 0 ? "pass" : "fail",
      detail: p.inputsNoLabel ? `${p.inputsNoLabel} field(s) have no label` : undefined,
      fix: "Give every input, select and textarea a visible <label htmlFor> or an aria-label.",
    },
    {
      id: "mobile-overflow", group: "Mobile", label: "No sideways scrolling on a phone",
      status: p.scrollWidth <= p.clientWidth + 1 ? "pass" : "fail",
      detail: p.scrollWidth <= p.clientWidth + 1 ? undefined : `Content is ${p.scrollWidth}px wide on a ${p.clientWidth}px screen`,
      fix: "Find what is wider than the phone screen (fixed widths, long unbroken text, wide images, negative margins) and make it fit; add overflow-x-hidden only as a last resort.",
    },
    {
      id: "images-load", group: "Accessibility", label: "All images load",
      status: p.brokenImages?.length ? "fail" : "pass",
      detail: p.brokenImages?.length ? `${p.brokenImages.length} image(s) are broken, for example ${describeBroken(p.brokenImages[0])}` : undefined,
      fix: p.brokenImages?.length
        ? `These images are broken: ${p.brokenImages.map(describeBroken).join("; ")}. The project has no image files of its own: use a real photo URL from your instructions, or replace a logo with a styled text wordmark or a lucide icon.`
        : undefined,
    },
    {
      id: "layout-cutoff", group: "Mobile", label: "Nothing sticks out past the screen edge",
      status: p.cutOff?.length ? "fail" : "pass",
      detail: p.cutOff?.length ? `${p.cutOff.length} element(s) are cut off, for example ${describeCutOff(p.cutOff[0])}` : undefined,
      fix: p.cutOff?.length
        ? `These elements stick out past the left or right edge of the screen. Put them back inside their container (padding, negative margins, fixed widths, absolute positioning without a relative parent): ${p.cutOff.map(describeCutOff).join("; ")}`
        : undefined,
    },
  ];
  return checks;
}

// ----------------------------------------------------------- score and fix prompt

export function score(checks: Check[]): number {
  const counted = checks.filter((c) => c.status !== "skip");
  if (!counted.length) return 0;
  const pts = counted.reduce((n, c) => n + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return Math.round((pts / counted.length) * 100);
}

export function healthFixPrompt(checks: Check[]): string {
  const bad = checks.filter((c) => (c.status === "fail" || c.status === "warn") && c.fix);
  if (!bad.length) return "";
  return [
    "A health check of the site found these problems. Fix all of them, changing only what is needed and keeping the design exactly as it is:",
    ...bad.map((c) => `- [${c.group}] ${c.label}${c.detail ? ` (${c.detail})` : ""}: ${c.fix}`),
  ].join("\n");
}
