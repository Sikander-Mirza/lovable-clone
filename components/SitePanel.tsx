"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { parseSite, type SiteSettings } from "@/lib/site";

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
}: {
  files: Record<string, string>;
  projectName: string;
  onChange: (s: SiteSettings) => void;
}) {
  const [open, setOpen] = useState(false);
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

  const label = "mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-white/40";
  const count = (n: number, max: number) => (
    <span className={n > max ? "text-amber-300" : "text-white/30"}>
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
        className={open ? "btn h-8 border border-violet-400/60 bg-violet-500/25 text-violet-100" : "btn-ghost h-8"}
      >
        <Globe size={13} /> Site
        {waOn && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="WhatsApp button is on" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
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
              <p className="mt-2 text-[11px] leading-snug text-white/35">
                Added to the page head when you download or deploy. The site address also creates a sitemap.
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
                  {!waOn && <p className="text-[11px] text-amber-300/80">Enter a valid number to show the button.</p>}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
