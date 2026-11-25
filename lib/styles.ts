// Style playbooks. "Make it modern" does not work as an instruction: the model falls back to white
// sections, default rounded cards and flat colors. Each playbook is a concrete recipe (mood, fonts,
// hero, navbar, cards, buttons, effects, exact Tailwind class snippets) for one well-known modern look.
// A cheap classification step picks the playbook that fits the request (see lib/siteBrief.ts) and the
// generate route adds it to the new project's request, so every site starts from a designed system.

export type StylePreset = {
  id: string;
  name: string;
  /** Shown to the classifier: which kinds of sites this look suits. */
  use: string;
  recipe: string;
};

export const STYLES: StylePreset[] = [
  {
    id: "dark-tech",
    name: "Dark tech",
    use: "software, SaaS, AI, developer tools, fintech, crypto, gaming, data products, tech agencies, dashboards and apps",
    recipe: `Mood: Linear / Vercel / Raycast. Near-black canvas, glowing accents, glass cards, big confident type.
Fonts and color: headingFont Sora, Space Grotesk or Bricolage Grotesque; font Inter or Manrope. Brand is one vivid hue (violet, blue, emerald or orange) used for glows and the primary highlight.
Page wrapper: <div className="min-h-screen bg-neutral-950 text-neutral-400 antialiased selection:bg-brand-500/30">. Headings text-white, body text-neutral-400, never pure black or pure gray-on-black.
Hero atmosphere (hero section is relative overflow-hidden, content in relative z-10): add three aria-hidden layers: <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.10),transparent_70%)]" />, <div className="pointer-events-none absolute left-1/2 top-[-10rem] h-[32rem] w-[48rem] -translate-x-1/2 rounded-full bg-brand-600/30 blur-[120px]" /> and a faint grid <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]" />.
Hero content: a small pill (inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 backdrop-blur) with a pulsing brand dot, then h1 text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] with gradient text (bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent), a text-lg text-neutral-400 max-w-2xl paragraph, two buttons (primary rounded-full bg-white px-5 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200; secondary rounded-full border border-white/15 px-5 py-2.5 text-sm text-white transition hover:bg-white/5), then a product mockup: rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-2xl shadow-brand-900/30 containing a rounded-xl inner panel (fake UI built from divs, a chart or a photo), fading out at the bottom with a gradient.
Navbar: sticky top-0 z-50 border-b border-white/5 bg-neutral-950/70 backdrop-blur-xl; links text-sm text-neutral-400 hover:text-white; one small primary button on the right.
Section heading pattern: eyebrow text-xs font-medium uppercase tracking-widest text-brand-400, then h2 text-3xl md:text-5xl font-semibold tracking-tight text-white, then a text-neutral-400 sub line, all left aligned or centered consistently.
Features as a BENTO grid: grid grid-cols-1 md:grid-cols-6 gap-4 with cards spanning md:col-span-2, md:col-span-3 and md:col-span-4 (mixed sizes that fill every row), one large card holding a mock UI or gradient image. Card: rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.06]; icon in h-10 w-10 rounded-lg bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 flex items-center justify-center.
Also include: a logo strip in a Marquee (text-neutral-500, grayscale), a Counter stats row with big gradient numbers, pricing with the middle plan highlighted (ring-1 ring-brand-500/60 and a faint brand gradient), a closing CTA in rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-12 text-center with a glow behind it, and a quiet footer (border-t border-white/5, text-sm text-neutral-500, 4 link columns).
Avoid: white sections, drop shadows in black, heavy borders, emoji, stock-photo cheesiness.`,
  },
  {
    id: "editorial-light",
    name: "Editorial light",
    use: "brands, studios, portfolios, architecture, consultancies, nonprofits, education, boutique shops, refined restaurants, personal sites",
    recipe: `Mood: a printed magazine or an Aesop / Kinfolk site. Warm off-white, huge serif headlines, hairlines, whitespace as the luxury.
Fonts and color: headingFont Instrument Serif, Fraunces or Cormorant Garamond; font Inter or Manrope. Brand is one restrained accent (deep green, terracotta or ink blue), used for hover states and tiny details only.
Page wrapper: <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">; body text-neutral-600; sections are separated by whitespace and thin rules (border-t border-neutral-900/10), not boxes.
Type: h1 text-6xl md:text-8xl font-normal leading-[0.95] tracking-tight with an italic emphasis word (<em className="italic">); eyebrow text-xs uppercase tracking-[0.2em] text-neutral-500; body text-lg leading-relaxed max-w-prose; pull quotes in the serif at text-3xl md:text-5xl.
Navbar: bg-[#faf9f7]/80 backdrop-blur border-b border-neutral-900/10; serif wordmark on the left, links text-xs uppercase tracking-widest on the right, no filled buttons (a text link with an arrow instead).
Layout: asymmetric 12-column grids (grid grid-cols-12 gap-x-8; text col-span-12 md:col-span-5, image col-span-12 md:col-span-7, and push one column down with md:mt-24), oversized section numerals (01, 02, 03 in the serif, text-neutral-300), full-bleed photo bands with a small caption underneath, lists as rows separated by hairlines (flex justify-between py-6 border-t border-neutral-900/10 with a hover:pl-4 transition).
Buttons: primary rounded-full bg-neutral-900 px-7 py-3.5 text-sm tracking-wide text-white transition hover:bg-brand-700; secondary is an underlined text link: group inline-flex items-center gap-2 border-b border-neutral-900 pb-1 text-sm with an arrow that slides group-hover:translate-x-1.
Images: aspect-[4/5] or aspect-[3/2] object-cover with ONE corner style for the whole site (rounded-none or rounded-2xl), inside overflow-hidden with transition duration-700 group-hover:scale-105; captions text-xs text-neutral-500.
Cards, if any: no shadows, border border-neutral-900/10 p-8 transition hover:bg-white.
Rhythm: section padding py-28 md:py-40, container max-w-6xl px-6, one big image or quote per screen, a Marquee of services set in large serif type, a footer with a huge wordmark.
Avoid: gradients, drop shadows, pill badges, icons in colored circles, three equal cards in a row as the default layout.`,
  },
  {
    id: "soft-gradient",
    name: "Soft gradient",
    use: "startups, consumer apps, fintech for consumers, creators, education platforms, health and wellness apps, marketplaces, agencies with a friendly tone",
    recipe: `Mood: Stripe / Framer / modern consumer app. Airy white, soft mesh gradients, rounded-3xl cards, floating UI, friendly and premium.
Fonts and color: headingFont Plus Jakarta Sans, Outfit or Manrope; font Inter. Brand is vivid; gradients pair it with a soft companion (fuchsia, sky or amber) only inside gradients and blobs.
Page wrapper: <div className="min-h-screen bg-white text-slate-600 antialiased">; headings text-slate-900; alternate sections between bg-white and bg-slate-50.
Atmosphere: blurred blobs behind hero and CTA: <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-brand-300/40 blur-3xl" /> plus a second one in another hue (bg-fuchsia-200/50 or bg-sky-200/60) offset to a corner.
Navbar: a floating pill, fixed top-4 inset-x-4 z-50 mx-auto max-w-5xl rounded-full bg-white/70 px-5 py-3 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5 backdrop-blur-xl, with a small primary button at the right end; add pt-28 to the hero so it clears the bar.
Hero: two columns. Left: pill label (rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100), h1 text-5xl md:text-6xl font-bold tracking-tight text-slate-900 with ONE gradient word (bg-gradient-to-r from-brand-600 to-fuchsia-500 bg-clip-text text-transparent), a text-lg paragraph, an email capture pill (flex rounded-full bg-white p-1.5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/10 with an input and a rounded-full primary button), a trust row (-space-x-2 avatar stack, five stars, 4.9 from 2,000 reviews). Right: layered floating cards (rounded-3xl bg-white p-5 shadow-xl shadow-brand-900/10 ring-1 ring-slate-900/5, slightly rotated, one wrapped in Tilt) over a gradient blob.
Cards: rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-1 hover:shadow-xl; icons in h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center; a bento grid with mixed spans where one big card is a gradient (bg-gradient-to-br from-brand-600 to-fuchsia-600 text-white) holding a mock UI.
Also include: a how-it-works row with numbered steps connected by a dashed line, testimonials in a Carousel, pricing with a monthly/yearly switch (useState) and the featured plan wrapped in a gradient border (p-[1px] bg-gradient-to-b from-brand-500 to-fuchsia-500 rounded-3xl around an inner bg-white rounded-[calc(1.5rem-1px)] card), an FAQ with Accordion, and a closing CTA band inside the container (rounded-[2rem] bg-gradient-to-br from-brand-600 to-fuchsia-600 p-12 text-white text-center).
Buttons: rounded-full px-6 py-3 text-sm font-semibold; primary bg-slate-900 text-white transition hover:bg-slate-800 (or the brand gradient), secondary bg-white text-slate-900 ring-1 ring-slate-900/10 hover:bg-slate-50.
Avoid: sharp corners, harsh black blocks, flat single-color sections everywhere, heavy borders.`,
  },
  {
    id: "luxe-dark",
    name: "Luxe dark editorial",
    use: "fashion, photography, hotels, fine dining, jewelry, automotive, wine, premium real estate, music, events, galleries and portfolios of visual work",
    recipe: `Mood: a luxury fashion house or a photographer's gallery. Black, ivory type, one muted accent, imagery does the talking.
Fonts and color: headingFont Cormorant Garamond, Fraunces or Instrument Serif; font Manrope or Inter. Brand is a muted champagne or gold (about #c9a96e) or a deep wine, used only for tiny details and hover states.
Page wrapper: <div className="min-h-screen bg-[#0b0b0c] text-neutral-400 antialiased">; headings text-[#f5f1e8] font-light tracking-tight; thin lines border-white/10; almost no boxed cards, let photos and whitespace carry the layout.
Hero: full viewport, relative min-h-[100svh] overflow-hidden; a photo as <img className="absolute inset-0 h-full w-full object-cover opacity-60" /> inside a Parallax; an overlay <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0c] via-black/30 to-black/50" />; content at the bottom left or centered: eyebrow text-[11px] uppercase tracking-[0.3em] text-neutral-300, h1 text-6xl md:text-9xl font-light leading-[0.9] tracking-tight in the serif, one outlined button (border border-white/30 px-8 py-3.5 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white hover:text-black), and a small scroll cue at the bottom edge.
Navbar: fixed top-0 inset-x-0 z-50 transparent over the hero and bg-black/60 backdrop-blur-xl border-b border-white/10 after scrolling (useScrolled); centered letter-spaced wordmark (text-sm uppercase tracking-[0.4em]) with links text-[11px] uppercase tracking-[0.2em] on both sides.
Sections: asymmetric image grids (one tall image col-span-5 next to two stacked smaller ones) with Parallax and tiny captions; a full-bleed serif italic quote band (text-4xl md:text-6xl font-light italic text-[#f5f1e8]); a big Carousel of aspect-[3/4] slides for collections or rooms; numbered lists (01 Rooms, 02 Spa) with hairline separators and a hover:pl-4 transition; ONE large testimonial quote instead of cards; a booking or contact block with underline-only inputs (border-b border-white/20 bg-transparent py-3 focus:border-brand-400 outline-none).
Images: aspect-[3/4] or aspect-[16/10], object-cover, contrast-110 saturate-[.9], overflow-hidden wrapper with transition duration-1000 group-hover:scale-105.
Footer: border-t border-white/10 py-16 with a large serif wordmark and small uppercase links.
Avoid: bright colors, rounded-xl cards, emoji, icon bullet grids, drop shadows.`,
  },
  {
    id: "warm-organic",
    name: "Warm organic",
    use: "cafes, bakeries, restaurants, wellness, yoga, spas, florists, kids and family, eco brands, pet care, home goods, craft and handmade, community spaces",
    recipe: `Mood: handmade, friendly and tactile. Cream paper, earthy color, soft irregular shapes, a little playfulness.
Fonts and color: headingFont Fraunces or Bricolage Grotesque; font Nunito or Manrope. Brand is earthy (terracotta, sage, mustard or plum) on warm cream backgrounds.
Page wrapper: <div className="min-h-screen bg-[#fbf6ee] text-stone-700 antialiased">; headings text-stone-900; alternate sections with bg-[#f3eadb] and one deep section bg-brand-900 text-stone-100.
Shapes: soft and irregular. Use rounded-[2.5rem] panels, arch-top photos (rounded-t-full overflow-hidden aspect-[3/4]), blob shapes behind images (<div className="absolute -z-10 h-72 w-72 rounded-[40%_60%_55%_45%] bg-brand-200/70 blur-2xl" />), wavy section dividers drawn with an inline SVG path, and sticker badges (absolute -right-4 -top-4 rotate-6 rounded-full bg-brand-600 p-4 text-xs font-bold uppercase text-white) overlapping photos.
Hero: left column with h1 text-5xl md:text-7xl font-semibold leading-[1.02] and one hand-underlined word (relative inline-block with decoration-wavy underline decoration-brand-400 decoration-4 underline-offset-8), a warm paragraph, and two chunky rounded-full buttons (primary bg-brand-600 px-7 py-3.5 font-semibold text-white shadow-[0_6px_0_0] shadow-brand-800 transition active:translate-y-[3px] active:shadow-[0_3px_0_0]; secondary border-2 border-stone-900/80 px-7 py-3.5 font-semibold hover:bg-stone-900 hover:text-white). Right column: a big arch photo with a rotated sticker ("Fresh daily", "Since 2012").
Cards: bg-white/70 rounded-[2rem] p-6 border border-stone-900/5 transition hover:-translate-y-1 hover:-rotate-1; product and menu cards with a rounded-3xl photo on top, a price pill (rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-800) and an add button.
Details: a Marquee of friendly keywords between sections, testimonials as slightly tilted sticky-note cards (bg-amber-100 rotate-1 and -rotate-1 shadow-md, handwritten feel), opening hours and address in a rounded panel with a map-style illustration, warm microcopy, an occasional emoji (but not in headings), a footer on bg-brand-900 with a big friendly wordmark.
Avoid: cold grays, thin sharp lines, dark mode, corporate stock photos.`,
  },
  {
    id: "neo-bold",
    name: "Neo bold",
    use: "creative studios, youth and streetwear brands, music, festivals and events, indie products, hackathons, games, bold campaigns",
    recipe: `Mood: neo-brutalist pop. Flat saturated color, thick black outlines, hard offset shadows, giant type, stickers.
Fonts and color: headingFont Syne, Bricolage Grotesque or Space Grotesk at heavy weights; font Space Grotesk or Manrope; JetBrains Mono for small labels. Palette: off-white bg-[#f4f1ea] or a bright flat brand background, black text, and 2 to 3 flat accents (brand-400, yellow-300, pink-400, lime-300).
Page wrapper: <div className="min-h-screen bg-[#f4f1ea] text-black antialiased">, body text-base font-medium. Cards, buttons and inputs: every one has border-2 border-black and a hard offset shadow shadow-[6px_6px_0_0_#000]; on hover it presses in (hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#000] transition). Pick ONE radius for the whole site (rounded-none or rounded-2xl). No soft shadows, no gradients, no glass.
Hero: h1 text-6xl md:text-[9rem] font-extrabold uppercase leading-[0.88] tracking-tighter; one word sits on a flat color block with a slight tilt (inline-block -rotate-2 bg-yellow-300 px-3 border-2 border-black); oversized buttons (border-2 border-black bg-yellow-300 px-6 py-3 font-bold uppercase shadow-[4px_4px_0_0_#000]); stickers (rotate-12 rounded-full border-2 border-black bg-pink-400 p-4 text-xs font-bold uppercase) overlapping the hero image; a black Marquee bar (bg-black py-3 text-white uppercase tracking-wide) right under the hero.
Navbar: border-b-2 border-black bg-[#f4f1ea] sticky top-0 z-50, bold uppercase links, a boxed button with the hard shadow.
Sections: card grids where every card has a different flat background (bg-yellow-300, bg-pink-300, bg-lime-300, bg-sky-300, bg-white) with border-2 and the hard shadow, hover:-rotate-1; huge outlined numerals ([-webkit-text-stroke:2px_#000] text-transparent text-8xl font-extrabold); FAQ as thick-bordered Accordion rows; a Counter row of big numbers inside boxed tiles; a giant footer wordmark (text-[14vw] font-extrabold uppercase leading-none).
Tone: loud, short, punchy copy.
Avoid: gradients, soft shadows, thin hairlines, muted pastel palettes, glass blur.`,
  },
];

export const STYLE_IDS = STYLES.map((s) => s.id);

export const styleById = (id: string | null | undefined): StylePreset | null => STYLES.find((s) => s.id === id) ?? null;

/** One line per playbook for the classifier prompt. */
export const styleMenu = (): string => STYLES.map((s) => `- ${s.id}: ${s.use}`).join("\n");

/** The text added to a new project's request. The plan's colors and fonts, if it has any, still win. */
export function styleBlock(id: string | null | undefined): string {
  const s = styleById(id);
  if (!s) return "";
  return [
    `Style playbook "${s.name}": this is how the site should look and feel. Follow its structure and class recipes closely and adapt the content to this business; where it conflicts with the generic design habits listed in your instructions, the playbook wins. If an Approved plan fixes the brand color or fonts, keep those and use the playbook for everything else (shapes, spacing, effects, layout patterns).`,
    s.recipe,
  ].join("\n");
}
