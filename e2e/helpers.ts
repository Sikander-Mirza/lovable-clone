import type { Page } from "@playwright/test";

/** A small but complete site, in the exact format the model streams. */
export const CANNED_REPLY = `Direction: warm, editorial coffee shop with a serif headline and a roasted-brown accent.
<file path="/theme.json">
{"brand":"#92400e","font":"Inter","headingFont":"Playfair Display"}
</file>
<file path="/site.json">
{"seo":{"title":"Harbor Coffee","description":"Small-batch coffee, roasted daily.","lang":"en"},"whatsapp":{"enabled":false,"number":"","message":""}}
</file>
<file path="/App.js">
import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
export default function App() {
  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <Hero />
    </div>
  );
}
</file>
<file path="/components/Navbar.js">
import React from "react";
export default function Navbar() {
  return (
    <nav className="flex items-center justify-between p-6">
      <b className="text-2xl text-brand-700">Harbor Coffee</b>
      <span className="text-sm text-gray-700">Menu · About · Visit</span>
    </nav>
  );
}
</file>
<file path="/components/Hero.js">
import React from "react";
export default function Hero() {
  return (
    <section className="px-8 py-24">
      <h1 className="max-w-2xl text-5xl font-bold text-brand-900">Small-batch coffee, roasted daily.</h1>
      <p className="mt-4 max-w-xl text-lg text-gray-700">Fresh beans from three family farms, delivered to your door.</p>
      <button className="mt-8 rounded bg-brand-600 px-6 py-3 text-white">Shop beans</button>
    </section>
  );
}
</file>
Built a two-section coffee site.`;

/**
 * Replaces the model with a canned reply and turns off the optional steps (questions, plan,
 * expand and the automatic screenshot review, unless `review` is true) so one prompt builds one
 * site straight away. Call before the first page load. Returns every request body the app sent
 * to /api/generate, so tests can inspect them.
 */
export async function mockAI(page: Page, opts: { review?: boolean; reply?: string } = {}) {
  const requests: { messages: { content: string; images?: string[]; label?: string }[] }[] = [];
  await page.addInitScript((review) => {
    localStorage.setItem("lovable-clone:ask-questions", "off");
    localStorage.setItem("lovable-clone:plan-first", "off");
    localStorage.setItem("lovable-clone:auto-expand", "off");
    localStorage.setItem("lovable-clone:auto-review", review ? "on" : "off");
  }, !!opts.review);
  await page.route("**/api/generate", (route) => {
    try {
      requests.push(JSON.parse(route.request().postData() ?? "{}"));
    } catch {}
    return route.fulfill({ status: 200, contentType: "text/plain; charset=utf-8", body: opts.reply ?? CANNED_REPLY });
  });
  return requests;
}

/** Types a prompt on the home page and waits until the built site shows in the preview. */
export async function buildSite(page: Page) {
  await page.goto("/");
  await page.getByPlaceholder(/landing page for a coffee shop/i).fill("A website for Harbor Coffee");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/project\//);
}

/** A site that uses the lovable-ui kit: reveal on scroll, a counter, a carousel, an accordion and a lightbox. */
export const KIT_REPLY = `Direction: lively editorial studio.
<file path="/theme.json">
{"brand":"#92400e","font":"Inter","headingFont":"Playfair Display"}
</file>
<file path="/site.json">
{"seo":{"title":"Kit Studio","description":"A lively studio.","lang":"en"},"whatsapp":{"enabled":false,"number":"","message":""}}
</file>
<file path="/App.js">
import React, { useState } from "react";
import { Reveal, Stagger, Counter, Carousel, Accordion, Lightbox, Marquee, useScrolled, ScrollProgress } from "lovable-ui";
export default function App() {
  const scrolled = useScrolled(40);
  const [open, setOpen] = useState(null);
  const shots = [1, 2, 3, 4].map((n) => ({ src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='600' height='400' fill='%23" + (n * 2) + "a" + (n * 3) + "'/></svg>", alt: "Shot " + n, caption: "Caption " + n }));
  return (
    <div className="bg-brand-50">
      <ScrollProgress />
      <nav data-testid="nav" className={"sticky top-0 z-40 p-4 transition " + (scrolled ? "bg-white shadow" : "bg-transparent")}>Kit Studio</nav>
      <section className="flex min-h-screen items-center px-8">
        <Reveal><h1 className="text-6xl font-bold">Alive by design</h1></Reveal>
      </section>
      <section className="px-8 py-24">
        <Stagger className="grid grid-cols-3 gap-6">
          <div data-testid="stat">Projects <b><Counter to={1200} suffix="+" /></b></div>
          <div>Awards <b><Counter to={48} /></b></div>
          <div>Years <b><Counter to={12} /></b></div>
        </Stagger>
      </section>
      <section className="px-8 py-12">
        <Marquee speed={20}><span>Alpha</span><span>Beta</span><span>Gamma</span></Marquee>
      </section>
      <section className="px-8 py-24">
        <Carousel itemWidth="300px">
          {shots.map((s, i) => (
            <button key={i} type="button" onClick={() => setOpen(i)} className="h-40 w-full rounded bg-brand-600 text-white">{s.alt}</button>
          ))}
        </Carousel>
        <Lightbox images={shots} index={open} onClose={() => setOpen(null)} onChange={setOpen} />
      </section>
      <section className="px-8 py-24">
        <Accordion items={[{ q: "How long does it take?", a: "About two weeks." }, { q: "Do you ship worldwide?", a: "Yes, everywhere." }]} />
      </section>
      <div style={{ height: 600 }} />
    </div>
  );
}
</file>
Built a lively site.`;
