"use client";

import { useEscape } from "@/lib/useEscape";

import { useEffect, useRef, useState } from "react";
import { Globe, Languages } from "lucide-react";
import { isRtl, parseSite, type SiteSettings } from "@/lib/site";

const translatePrompt = (code: string, name: string) =>
  `Translate every visible text on the site into ${name} (natural wording, not word for word), including the page title and description in /site.json, and set "lang" in /site.json seo to "${code}". Keep the layout, the brand and the file structure.` +
  (isRtl(code) ? " The page is right-to-left: use direction-neutral Tailwind classes (ms-/me-/ps-/pe-/text-start) and flip directional icons with rtl:rotate-180." : "");

const LANGS: [string, string][] = [
  ["en", "English"],
  ["ur", "Urdu"],
  ["ar", "Arabic"],
  ["hi", "Hindi"],
  ["fr", "French"],
  ["es", "Spanish"],
  ["de", "German"],
  ["tr", "Turkish"],
];

/** "Site" popover: SEO tags for search and social sharing, and a WhatsApp chat button. */
export default function SitePanel({
  files,
  projectName,
  onChange,
  onAskAI,
}: {
  files: Record<string, string>;
  projectName: string;
  onChange: (s: SiteSettings) => void;
  onAskAI?: (prompt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));
  // Open towards the left when there is not enough room on the right (narrow windows).
  const [alignRight, setAlignRight] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<SiteSettings>(() => parseSite(files));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Re-seed when the settings change from outside (undo, restore).
  useEffect(() => {
    setDraft(parseSite(files));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files["/site.json"]]);

  const update = (next: SiteSettings) => {
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 500); // every change reloads the preview
  };
  const seo = (patch: Partial<SiteSettings["seo"]>) => update({ ...draft, seo: { ...draft.seo, ...patch } });
  const wa = (patch: Partial<SiteSettings["whatsapp"]>) => update({ ...draft, whatsapp: { ...draft.whatsapp, ...patch } });

  const label = "mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-white/60";
  const count = (n: number, max: number) => (
    <span className={n > max ? "text-amber-300" : "text-white/60"}>
      {n}/{max}
    </span>
  );
  const waOn = draft.whatsapp.enabled && draft.whatsapp.number.length >= 7;

  return (
    <div className="relative" ref={btnRef}>
      <button
        onClick={() => {
          const r = btnRef.current?.getBoundingClientRect();
          if (r) setAlignRight(r.left + 340 > window.innerWidth - 12);
          setOpen((v) => !v);
        }}
        title="SEO and WhatsApp button"
        className="tool-btn"
        data-open={open}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Site settings: SEO and WhatsApp"
      >
        <Globe size={14} /> <span className="tool-label">Site</span>
        {waOn && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="WhatsApp button is on" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Site settings"
            className={`popover absolute top-full z-50 mt-2 max-h-[75vh] w-[340px] max-w-[calc(100vw-24px)] space-y-4 overflow-y-auto p-4 ${
              alignRight ? "right-0" : "left-0"
            }`}
          >
            <div>
              <div className="mb-2 text-xs font-medium text-white/80">Search and sharing (SEO)</div>
              <label className="block">
                <span className={label}>
                  Page title {count(draft.seo.title.length, 60)}
                </span>
                <input value={draft.seo.title} onChange={(e) => seo({ title: e.target.value })} placeholder={projectName} className="field py-1.5 text-xs" />
              </label>
              <label className="mt-2.5 block">
                <span className={label}>
                  Description {count(draft.seo.description.length, 160)}
                </span>
                <textarea
                  value={draft.seo.description}
                  onChange={(e) => seo({ description: e.target.value })}
                  rows={3}
                  placeholder="One or two sentences shown on Google"
                  className="field resize-none py-1.5 text-xs"
                />
              </label>
              <label className="mt-2.5 block">
                <span className={label}>Share image (URL)</span>
                <input value={draft.seo.image} onChange={(e) => seo({ image: e.target.value })} placeholder="https://..." className="field py-1.5 text-xs" />
              </label>
              <div className="mt-2.5 grid grid-cols-[1fr_110px] gap-2">
                <label className="block">
                  <span className={label}>Site address</span>
                  <input value={draft.seo.url} onChange={(e) => seo({ url: e.target.value })} placeholder="https://yoursite.com" className="field py-1.5 text-xs" />
                </label>
                <label className="block">
                  <span className={label}>Language</span>
                  <select value={draft.seo.lang} onChange={(e) => seo({ lang: e.target.value })} className="field py-1.5 text-xs">
                    {LANGS.map(([c, n]) => (
                      <option key={c} value={c}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {onAskAI && Object.keys(files).length > 0 && (
                <button
                  onClick={() => {
                    const name = LANGS.find(([c]) => c === draft.seo.lang)?.[1] ?? draft.seo.lang;
                    setOpen(false);
                    onAskAI(translatePrompt(draft.seo.lang, name));
                  }}
                  className="btn mt-2.5 h-8 w-full border border-white/10 text-xs"
                  title="Rewrite all the text of the site in the selected language"
                >
                  <Languages size={13} /> Translate the site to {LANGS.find(([c]) => c === draft.seo.lang)?.[1]}
                </button>
              )}
              <p className="mt-2 text-xs leading-snug text-white/60">
                Added to the page head when you download or deploy. The site address also creates a sitemap. Urdu and Arabic switch the page to right-to-left with a proper font.
              </p>
            </div>

            <div className="border-t border-white/10 pt-3">
              <label className="flex cursor-pointer items-center justify-between text-xs font-medium text-white/80">
                WhatsApp chat button
                <input type="checkbox" checked={draft.whatsapp.enabled} onChange={(e) => wa({ enabled: e.target.checked })} className="accent-emerald-500" />
              </label>
              {draft.whatsapp.enabled && (
                <div className="mt-2.5 space-y-2.5">
                  <label className="block">
                    <span className={label}>Number (with country code)</span>
                    <input value={draft.whatsapp.number} onChange={(e) => wa({ number: e.target.value })} placeholder="923001234567" inputMode="numeric" className="field py-1.5 text-xs" />
                  </label>
                  <label className="block">
                    <span className={label}>First message</span>
                    <input value={draft.whatsapp.message} onChange={(e) => wa({ message: e.target.value })} className="field py-1.5 text-xs" />
                  </label>
                  {!waOn && <p className="text-xs text-amber-300/80">Enter a valid number to show the button.</p>}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
