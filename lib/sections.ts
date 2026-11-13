// Manage the sections of a single-page site without the AI: reorder, hide, remove, and add
// ready-made ones from a small library. Works on the section lines in /App.js
// (`<Hero />` per line), which is the shape the builder generates.

export type Section = { name: string; hidden: boolean; line: number };

const LAYOUT = /^(app|navbar|nav|navigation|header|topbar|footer|layout|scrolltotop|router|routes|emergencyfab)$/i;
// `<Hero />`  or a hidden one: `{/* <Hero /> */}`
const LINE = /^(\s*)(\{\/\*\s*)?<([A-Z][A-Za-z0-9]*)\s*\/>(\s*\*\/\})?\s*$/;

export function listSections(app: string): Section[] {
  const out: Section[] = [];
  app.split("\n").forEach((l, i) => {
    const m = l.match(LINE);
    if (m && !LAYOUT.test(m[3])) out.push({ name: m[3], hidden: !!m[2], line: i });
  });
  return out;
}

const mapLines = (app: string, fn: (lines: string[]) => string[] | null) => {
  const next = fn(app.split("\n"));
  return next ? next.join("\n") : app;
};

/** Swap a section with its neighbour (skipping non-section lines between them). */
export function moveSection(app: string, name: string, dir: -1 | 1): string {
  const secs = listSections(app);
  const i = secs.findIndex((s) => s.name === name);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= secs.length) return app;
  return mapLines(app, (lines) => {
    const a = secs[i].line;
    const b = secs[j].line;
    [lines[a], lines[b]] = [lines[b], lines[a]];
    return lines;
  });
}

export function toggleSection(app: string, name: string): string {
  return mapLines(app, (lines) => {
    const s = listSections(app).find((x) => x.name === name);
    if (!s) return null;
    const m = lines[s.line].match(LINE)!;
    lines[s.line] = s.hidden ? `${m[1]}<${name} />` : `${m[1]}{/* <${name} /> */}`;
    return lines;
  });
}

/** Removes the section's line and its import. The component file is removed by the caller. */
export function removeSection(app: string, name: string): string {
  return mapLines(app, (lines) => {
    const s = listSections(app).find((x) => x.name === name);
    if (!s) return null;
    const importRe = new RegExp(`^\\s*import\\s+${name}\\s+from\\s+['"][^'"]+['"];?\\s*$`);
    return lines.filter((_, i) => i !== s.line).filter((l) => !importRe.test(l));
  });
}

/** Adds an import and a `<Name />` line (after `after` if given, else before the footer / main end). */
export function insertSection(app: string, name: string, after?: string): string {
  if (new RegExp(`<${name}\\s*/>`).test(app)) return app;
  const lines = app.split("\n");

  // import after the last import line
  let lastImport = -1;
  lines.forEach((l, i) => {
    if (/^\s*import\s/.test(l)) lastImport = i;
  });
  lines.splice(lastImport + 1, 0, `import ${name} from './components/${name}';`);

  const secs = listSections(lines.join("\n"));
  const anchor = after ? secs.find((s) => s.name === after) : secs[secs.length - 1];
  let at: number;
  let indent = "          ";
  if (anchor) {
    at = anchor.line + 1;
    indent = lines[anchor.line].match(/^\s*/)![0];
  } else {
    const footer = lines.findIndex((l) => /<Footer\s*\/>/.test(l));
    const mainEnd = lines.findIndex((l) => /<\/main>/.test(l));
    at = mainEnd >= 0 ? mainEnd : footer >= 0 ? footer : lines.length - 1;
    indent = (lines[at] ?? "").match(/^\s*/)![0] + "  ";
  }
  lines.splice(at, 0, `${indent}<${name} />`);
  return lines.join("\n");
}

// ---------------------------------------------------------------- library

export type LibraryItem = { name: string; label: string; description: string; code: string };

const wrap = (body: string, name: string) => `import React from 'react';\n\nexport default function ${name}() {\n${body}\n}\n`;

export const LIBRARY: LibraryItem[] = [
  {
    name: "FAQ",
    label: "FAQ",
    description: "Questions that open and close",
    code: `import React, { useState } from 'react';

const ITEMS = [
  { q: 'How do I get started?', a: 'Contact us using the form below or message us on WhatsApp. We reply within one working day.' },
  { q: 'What are your prices?', a: 'Prices depend on what you need. Ask for a quote and we will send a clear breakdown, with no hidden fees.' },
  { q: 'How long does it take?', a: 'Most requests are completed within a few days. We will confirm a timeline before we begin.' },
  { q: 'Can I change my booking?', a: 'Yes. Let us know at least 24 hours ahead and we will move it to a time that suits you.' },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-slate-900">Questions, answered</h2>
        <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {ITEMS.map((it, i) => (
            <div key={it.q}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-medium text-slate-900 hover:text-brand-700"
              >
                {it.q}
                <span className="text-2xl text-brand-600">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <p className="pb-5 text-slate-600">{it.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,
  },
  {
    name: "Pricing",
    label: "Pricing",
    description: "Three plans, one highlighted",
    code: `import React from 'react';

const PLANS = [
  { name: 'Starter', price: '$19', note: 'per month', features: ['Core features', 'Email support', '1 user'], featured: false },
  { name: 'Standard', price: '$49', note: 'per month', features: ['Everything in Starter', 'Priority support', '5 users', 'Reports'], featured: true },
  { name: 'Premium', price: '$99', note: 'per month', features: ['Everything in Standard', 'Dedicated manager', 'Unlimited users'], featured: false },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-slate-900">Simple pricing</h2>
        <p className="mt-2 text-slate-600">Pick a plan. Change or cancel whenever you like.</p>
        <div className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={p.featured ? 'flex flex-col bg-brand-600 p-8 text-white md:-my-3' : 'flex flex-col border border-slate-200 bg-white p-8'}>
              <div className="text-sm font-semibold uppercase tracking-wide opacity-80">{p.name}</div>
              <div className="mt-3 text-4xl font-bold">{p.price}<span className="ml-1 text-base font-normal opacity-70">{p.note}</span></div>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {p.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <a href="#contact" className={p.featured ? 'mt-8 bg-white px-5 py-3 text-center font-semibold text-brand-700 hover:bg-slate-100' : 'mt-8 bg-brand-600 px-5 py-3 text-center font-semibold text-white hover:bg-brand-700'}>
                Choose {p.name}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,
  },
  {
    name: "Newsletter",
    label: "Newsletter signup",
    description: "Email field with a success message",
    code: `import React, { useState } from 'react';
import { submitForm } from 'lovable';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');

  async function onSubmit(e) {
    e.preventDefault();
    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) { setState('invalid'); return; }
    setState('sending');
    const ok = await submitForm('newsletter', { email });
    setState(ok ? 'done' : 'error');
    if (ok) setEmail('');
  }

  return (
    <section id="newsletter" className="bg-brand-600 px-6 py-16 text-white">
      <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold">Stay in the loop</h2>
          <p className="mt-1 text-white/80">News and offers, no spam. Unsubscribe any time.</p>
        </div>
        <form onSubmit={onSubmit} className="flex w-full max-w-md gap-2" noValidate>
          <label className="sr-only" htmlFor="nl-email">Email</label>
          <input id="nl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="min-w-0 flex-1 px-4 py-3 text-slate-900 outline-none" />
          <button disabled={state === 'sending'} className="bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {state === 'sending' ? 'Sending...' : 'Subscribe'}
          </button>
        </form>
      </div>
      <p role="status" className="mx-auto mt-3 max-w-4xl text-sm">
        {state === 'done' && 'Thank you! You are subscribed.'}
        {state === 'invalid' && 'Please enter a valid email address.'}
        {state === 'error' && 'Something went wrong. Please try again.'}
      </p>
    </section>
  );
}
`,
  },
  {
    name: "Stats",
    label: "Stats strip",
    description: "Four big numbers",
    code: wrap(
      `  const stats = [
    { n: '10+', l: 'Years of experience' },
    { n: '5,000+', l: 'Happy customers' },
    { n: '24/7', l: 'Support' },
    { n: '98%', l: 'Would recommend us' },
  ];
  return (
    <section className="border-y border-slate-200 bg-white px-6 py-12">
      <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="px-4 md:border-l md:border-slate-200 md:first:border-l-0">
            <dd className="text-4xl font-bold text-brand-700">{s.n}</dd>
            <dt className="mt-1 text-sm text-slate-600">{s.l}</dt>
          </div>
        ))}
      </dl>
    </section>
  );`,
      "Stats"
    ),
  },
];

/** Chat request that redesigns one section and leaves everything else alone. */
export function regeneratePrompt(name: string, note: string): string {
  const label = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const extra = note.trim() ? ` What to change: ${note.trim()}.` : " Give it a clearly different layout and composition than the current one, keeping the same content and brand.";
  return (
    `Redesign ONLY the "${label}" section (/components/${name}.js).${extra} ` +
    `Keep the same file name and default export, the same copy unless asked, and the brand theme. Do not change any other file.`
  );
}
