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

export type PlanProblems = { extra: string[]; missing: string[]; missingPages?: string[] };

const baseName = (path: string) => (path.split("/").pop() ?? "").replace(/\.jsx?$/, "");

/** Names imported from local files (./ or ../): the page's own sections, not icons or libraries. */
function localImports(src: string): Set<string> {
  return new Set([...src.matchAll(/import\s+(\w+)\s+from\s+["']\.{1,2}\/[^"']*["']/g)].map((m) => m[1]));
}

/**
 * Multi-page plans: each page's file (/pages/<Page>.js) must render that page's planned sections
 * and nothing else. Skipped when the site is not built with a /pages folder.
 */
function checkPages(files: Record<string, string>, plan: Plan): PlanProblems | null {
  const pageFiles = Object.keys(files).filter((f) => /^\/pages\/.+\.jsx?$/.test(f));
  if (!pageFiles.length) return null;
  const componentFiles = Object.keys(files).filter((f) => /^\/components\/.+\.jsx?$/.test(f)).map(baseName);
  const out: PlanProblems = { extra: [], missing: [], missingPages: [] };

  for (const page of plan.pages) {
    const wanted = plan.sections.filter((s) => s.include && (s.page || plan.pages[0]) === page).map((s) => s.title);
    if (!wanted.length) continue;
    const file = pageFiles.find((f) => matches(baseName(f), page));
    if (!file) {
      out.missingPages!.push(page);
      continue;
    }
    const local = localImports(files[file]);
    const rendered = renderedComponents(files[file]).filter((c) => local.has(c) && !LAYOUT.test(norm(c)));
    for (const c of rendered) {
      if (!wanted.some((t) => matches(c, t)) && !isFeatureWidget(c, plan.features)) out.extra.push(`${c} (on ${page})`);
    }
    for (const t of wanted) {
      // A section may also be written inline in the page file, so a component file counts too.
      const present = rendered.some((c) => matches(c, t)) || componentFiles.some((c) => matches(c, t));
      if (!present) out.missing.push(`${t} (on ${page})`);
    }
  }
  return out.extra.length || out.missing.length || out.missingPages!.length ? out : null;
}

/** Returns null when the plan was followed or the check does not apply. */
export function checkPlan(files: Record<string, string>, plan: Plan): PlanProblems | null {
  if (plan.kind !== "site") return null;
  if (plan.pages.length > 1) return checkPages(files, plan);
  const app = files["/App.js"];
  // Single-page: a router wrapper around one page is fine, several routes are not judged here.
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
  if (p.missingPages?.length) {
    lines.push(
      `- Planned pages that are missing: ${p.missingPages.join(", ")}. Create each as /pages/<PascalCaseName>.js with its planned sections and add a <Route> for it in /App.js.`
    );
  }
  if (p.missing.length) {
    lines.push(
      `- Planned sections that are missing: ${p.missing.join(", ")}. Create each as /components/<PascalCaseTitle>.js and render it in /App.js in the plan's order.`
    );
  }
  return lines.join("\n");
}
