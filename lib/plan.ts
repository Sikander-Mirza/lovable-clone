// A short, editable plan the AI proposes before building a website: visual direction,
// palette, fonts and the sections in order with a layout idea for each. The user can edit it,
// and the approved plan is sent along with the request so the build follows it.
import { DEFAULT_THEME, FONTS } from "./theme";

export type PlanSection = {
  title: string;
  /** What this section is for (one line). */
  purpose: string;
  /** A concrete layout idea for this section (one line). */
  layout: string;
  /** What real content goes in it (one line). */
  content: string;
  /** Unticked sections are dropped from the build. */
  include: boolean;
};

export type Plan = {
  kind: "site" | "tool";
  direction: string;
  brand: string;
  font: string;
  headingFont: string;
  pages: string[];
  sections: PlanSection[];
  features: string[];
};

const str = (v: unknown, max = 240) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, max: number, len = 60): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : [];

/** Extracts and sanitizes the model's JSON. Returns null when it is unusable. */
export function parsePlan(raw: string): Plan | null {
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let d: any;
  try {
    d = JSON.parse(raw.slice(a, b + 1));
  } catch {
    return null;
  }
  if (d?.kind === "tool") {
    return { kind: "tool", direction: "", brand: DEFAULT_THEME.brand, font: DEFAULT_THEME.font, headingFont: DEFAULT_THEME.font, pages: [], sections: [], features: [] };
  }
  const sections: PlanSection[] = (Array.isArray(d?.sections) ? d.sections : [])
    .map((s: any) => ({
      title: str(s?.title, 60),
      purpose: str(s?.purpose),
      layout: str(s?.layout),
      content: str(s?.content),
      include: true,
    }))
    .filter((s: PlanSection) => s.title)
    .slice(0, 12);
  if (sections.length < 3) return null;

  const font = (FONTS as readonly string[]).includes(d?.font) ? d.font : DEFAULT_THEME.font;
  return {
    kind: "site",
    direction: str(d?.direction, 500),
    brand: /^#[0-9a-fA-F]{6}$/.test(d?.brand ?? "") ? String(d.brand).toLowerCase() : DEFAULT_THEME.brand,
    font,
    headingFont: (FONTS as readonly string[]).includes(d?.headingFont) ? d.headingFont : font,
    pages: list(d?.pages, 8),
    sections,
    features: list(d?.features, 8, 80),
  };
}

/** The approved plan as text for the model (only the sections that are still ticked). */
export function formatPlan(plan: Plan): string {
  const secs = plan.sections.filter((s) => s.include);
  const lines = [
    "Approved plan (follow it closely: this is what the user reviewed and accepted):",
    `- Visual direction: ${plan.direction}`,
    `- Theme: /theme.json must be {"brand":"${plan.brand}","font":"${plan.font}","headingFont":"${plan.headingFont}"}`,
  ];
  if (plan.pages.length > 1) lines.push(`- Pages: ${plan.pages.join(", ")}`);
  if (plan.features.length) lines.push(`- Features: ${plan.features.join("; ")}`);
  lines.push("- Sections, in this order:");
  secs.forEach((s, i) => {
    lines.push(`  ${i + 1}. ${s.title}${s.purpose ? ` — ${s.purpose}` : ""}`);
    if (s.layout) lines.push(`     Layout: ${s.layout}`);
    if (s.content) lines.push(`     Content: ${s.content}`);
  });
  lines.push("Do not add sections that are not in the plan and do not drop any that are.");
  return lines.join("\n");
}
