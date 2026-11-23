import type { Page } from "@playwright/test";

/** A small but complete site, in the exact format the model streams. */
export const CANNED_REPLY = `Direction: warm, editorial coffee shop with a serif headline and a roasted-brown accent.
<file path="/theme.json">
{"brand":"#92400e","font":"Inter","headingFont":"Playfair Display"}
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
 * expand) so one prompt builds one site straight away. Call before the first page load.
 */
export async function mockAI(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("lovable-clone:ask-questions", "off");
    localStorage.setItem("lovable-clone:plan-first", "off");
    localStorage.setItem("lovable-clone:auto-expand", "off");
  });
  await page.route("**/api/generate", (route) =>
    route.fulfill({ status: 200, contentType: "text/plain; charset=utf-8", body: CANNED_REPLY })
  );
}

/** Types a prompt on the home page and waits until the built site shows in the preview. */
export async function buildSite(page: Page) {
  await page.goto("/");
  await page.getByPlaceholder(/landing page for a coffee shop/i).fill("A website for Harbor Coffee");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/project\//);
}
