// Did the build follow the approved plan? Section components are named after the plan titles
// (PascalCase), so a single-page site can be checked deterministically: every ticked section
// must be rendered by App.js, and nothing else except the navbar, footer and feature widgets.
import type { Plan } from "./plan";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Layout pieces that are never "sections".
const LAYOUT = /^(app|navbar|nav|navigation|header|topbar|announcement\w*|footer|layout|scrolltotop|cookie\w*|themeprovider|router|routes)$/;

function renderedComponents(app: string): string[] {
  return Array.from(new Set([...app.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)].map((m) => m[1])));
}

const matches = (component: string, title: string) => {
  const c = norm(component);
  const t = norm(title);
  if (!c || !t) return false;
  return c === t || (c.length >= 4 && t.includes(c)) || (t.length >= 4 && c.includes(t));
};

/** True when the component exists because of a planned feature (e.g. "Emergency call button"). */
function isFeatureWidget(component: string, features: string[]): boolean {
  const c = norm(component);
  return features.some((f) => {
    const words = f.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 5);
    return words.some((w) => c.includes(w)) || (c.length >= 3 && norm(f).includes(c));
  });
}

export type PlanProblems = { extra: string[]; missing: string[] };

/** Returns null when the check does not apply (multi-page sites are not checked). */
export function checkPlan(files: Record<string, string>, plan: Plan): PlanProblems | null {
  if (plan.kind !== "site" || plan.pages.length > 1) return null;
  const app = files["/App.js"];
  // Multi-route sites are not checked. A router wrapper around a single page is fine.
  if (!app || /<Routes\b|<Route\b/.test(app)) return null;

  const rendered = renderedComponents(app).filter((c) => !LAYOUT.test(norm(c)));
  const wanted = plan.sections.filter((s) => s.include).map((s) => s.title);

  const extra = rendered.filter(
    (c) => !wanted.some((t) => matches(c, t)) && !isFeatureWidget(c, plan.features)
  );
  const missing = wanted.filter((t) => !rendered.some((c) => matches(c, t)));
  return extra.length || missing.length ? { extra, missing } : null;
}

export function planFixPrompt(p: PlanProblems): string {
  const lines = ["The build does not match the approved plan. Fix it now, changing only what is needed:"];
  if (p.extra.length) {
    lines.push(
      `- Sections that are NOT in the plan and must be removed: ${p.extra.join(", ")}. Stop rendering them in /App.js and delete their files with <delete path="..."/>.`
    );
  }
  if (p.missing.length) {
    lines.push(
      `- Planned sections that are missing: ${p.missing.join(", ")}. Create each as /components/<PascalCaseTitle>.js and render it in /App.js in the plan's order.`
    );
  }
  return lines.join("\n");
}
