"use client";

import { ArrowDown, ArrowUp, ClipboardList, Loader2, Plus, RefreshCw } from "lucide-react";
import { FONTS } from "@/lib/theme";
import { MAX_SECTIONS, MAX_SECTIONS_MULTI, type Plan, type PlanSection } from "@/lib/plan";

/** The AI's plan for the site, editable before anything is built. */
export default function PlanCard({
  plan,
  onChange,
  onApprove,
  onSkip,
  onReplan,
  replanning,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
  onApprove: () => void;
  onSkip: () => void;
  onReplan: () => void;
  replanning?: boolean;
}) {
  const setSection = (i: number, patch: Partial<PlanSection>) =>
    onChange({ ...plan, sections: plan.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const multi = plan.pages.length > 1;
  const pageOf = (s: PlanSection) => s.page || plan.pages[0];
  const max = multi ? MAX_SECTIONS_MULTI : MAX_SECTIONS;
  // Moves a section past its neighbour on the same page (the whole list when single-page).
  const move = (i: number, d: -1 | 1) => {
    let j = i + d;
    while (multi && j >= 0 && j < plan.sections.length && pageOf(plan.sections[j]) !== pageOf(plan.sections[i])) j += d;
    if (j < 0 || j >= plan.sections.length) return;
    const next = [...plan.sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...plan, sections: next });
  };
  const included = plan.sections.filter((s) => s.include).length;
  const small = "rounded-md border border-white/10 bg-white/[.04] px-2 py-1 text-xs text-white outline-none focus:border-violet-400/50";

  return (
    <div className="rise space-y-3 rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-500/[.08] to-transparent p-3.5">
      <div className="flex items-center gap-2">
        <ClipboardList size={15} className="text-violet-300" />
        <div className="text-sm font-medium">Review the plan</div>
        <button
          onClick={onReplan}
          disabled={replanning}
          title="Ask for a different plan"
          className="ml-auto flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {replanning ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Re-plan
        </button>
      </div>

      <label className="block text-[11px] uppercase tracking-wide text-white/40">
        Visual direction
        <textarea
          value={plan.direction}
          onChange={(e) => onChange({ ...plan, direction: e.target.value })}
          rows={3}
          className={`${small} mt-1 w-full resize-none text-[13px] normal-case leading-snug tracking-normal`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={plan.brand}
          onChange={(e) => onChange({ ...plan, brand: e.target.value })}
          className="h-7 w-9 cursor-pointer rounded border border-white/15 bg-transparent"
          title="Brand color"
        />
        <select value={plan.font} onChange={(e) => onChange({ ...plan, font: e.target.value })} className={small} title="Body font">
          {FONTS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          value={plan.headingFont}
          onChange={(e) => onChange({ ...plan, headingFont: e.target.value })}
          className={small}
          title="Heading font"
        >
          {FONTS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wide text-white/40">
          {multi ? `${plan.pages.length} pages · ` : ""}Sections ({included} of {plan.sections.length})
        </div>
        {(multi ? plan.pages : [""]).map((page) => (
        <div key={page} className={multi ? "mb-2" : ""}>
        {multi && (
          <div className="mb-1 mt-1 flex items-center gap-1.5 text-[11px] font-medium text-violet-200">
            <span className="rounded bg-violet-500/20 px-1.5 py-0.5">{page}</span>
            <button
              onClick={() =>
                onChange({
                  ...plan,
                  sections: [
                    ...plan.sections,
                    { title: "New section", purpose: "", layout: "", content: "", include: true, page },
                  ],
                })
              }
              disabled={plan.sections.length >= max}
              className="ml-auto flex items-center gap-1 text-[11px] text-white/50 hover:text-white disabled:opacity-40"
            >
              <Plus size={11} /> Add
            </button>
          </div>
        )}
        <ol className="space-y-1.5">
          {plan.sections.map((s, i) =>
            multi && pageOf(s) !== page ? null : (
            <li
              key={i}
              className={`rounded-lg border p-2 transition ${
                s.include ? "border-white/10 bg-white/[.03]" : "border-white/5 opacity-45"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={s.include}
                  onChange={(e) => setSection(i, { include: e.target.checked })}
                  className="accent-violet-500"
                  title="Include this section"
                />
                <input
                  value={s.title}
                  onChange={(e) => setSection(i, { title: e.target.value })}
                  className={`${small} min-w-0 flex-1 font-medium`}
                />
                <button onClick={() => move(i, -1)} disabled={i === 0} className="icon-btn h-6 w-6" title="Move up">
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === plan.sections.length - 1}
                  className="icon-btn h-6 w-6"
                  title="Move down"
                >
                  <ArrowDown size={12} />
                </button>
              </div>
              <input
                value={s.layout}
                onChange={(e) => setSection(i, { layout: e.target.value })}
                placeholder="Layout idea"
                className={`${small} mt-1.5 w-full text-white/70`}
              />
            </li>
            )
          )}
        </ol>
        </div>
        ))}
        {!multi && (
          <button
            onClick={() =>
              onChange({
                ...plan,
                sections: [...plan.sections, { title: "New section", purpose: "", layout: "", content: "", include: true }],
              })
            }
            disabled={plan.sections.length >= max}
            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-1.5 text-xs text-white/55 hover:border-violet-400/50 hover:text-white disabled:opacity-40"
          >
            <Plus size={12} /> Add a section
          </button>
        )}
      </div>

      {plan.features.length > 0 && (
        <div className="text-[11px] text-white/45">
          Features: <span className="text-white/65">{plan.features.join(" · ")}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <button onClick={onSkip} className="text-xs text-white/45 hover:text-white">
          Skip the plan
        </button>
        <button
          onClick={onApprove}
          disabled={included < 2}
          className="btn-primary h-8 px-4 text-xs"
        >
          Build this plan
        </button>
      </div>
    </div>
  );
}
