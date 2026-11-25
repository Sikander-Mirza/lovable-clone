import { expect, test } from "@playwright/test";
import { brandScale } from "../lib/theme";
import { CANNED_REPLY, KIT_REPLY, buildSite, mockAI } from "./helpers";

test.describe("landing page", () => {
  test("has a skip link, example prompts and a caption that follows the options", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a.skip-link")).toHaveAttribute("href", "#main");

    await page.getByRole("button", { name: /specialty coffee roastery/i }).click();
    await expect(page.getByPlaceholder(/landing page for a coffee shop/i)).toHaveValue(/coffee roastery/i);

    await expect(page.getByText(/When you press Build, the AI will ask a few quick questions/)).toBeVisible();
    await page.getByRole("switch", { name: /Ask me questions first/i }).click();
    await expect(page.getByText(/When you press Build, the AI will show you a plan/)).toBeVisible();
  });

  test("every icon-only button has an accessible name", async ({ page }) => {
    await page.goto("/");
    const unnamed = await page.$$eval("button, a", (els) =>
      els.filter((e) => !(e.textContent?.trim() || e.getAttribute("aria-label") || e.getAttribute("title"))).length
    );
    expect(unnamed).toBe(0);
  });
});

/** The build is over and the page has reloaded once with the theme (the hero button shows the brand color). */
async function settled(page: import("@playwright/test").Page) {
  const hex = brandScale("#92400e")["600"];
  const rgb = `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
  await expect(page.frameLocator('iframe[title="Preview"]').getByRole("button", { name: "Shop beans" })).toHaveCSS("background-color", rgb);
  await page.waitForTimeout(1500);
}

test.describe("motion kit (lovable-ui)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAI(page, { reply: KIT_REPLY });
    await buildSite(page);
  });
  const frame = (page: import("@playwright/test").Page) => page.frameLocator('iframe[title="Preview"]');

  test("a section reveals on scroll and a counter counts up to its value", async ({ page }) => {
    const f = frame(page);
    await expect(f.getByRole("heading", { name: "Alive by design" })).toHaveCSS("opacity", "1", { timeout: 60_000 });
    // The stats are below the fold: invisible until scrolled to, then they fade in and count up.
    const stat = f.getByTestId("stat");
    const wrapper = stat.locator("xpath=.."); // Stagger wraps each child in a Reveal, which carries the opacity
    await expect(wrapper).toHaveCSS("opacity", "0");
    await stat.scrollIntoViewIfNeeded();
    await expect(wrapper).toHaveCSS("opacity", "1", { timeout: 10_000 });
    await expect(stat).toContainText("1,200+", { timeout: 10_000 });
  });

  test("the navbar changes when the page scrolls", async ({ page }) => {
    const f = frame(page);
    const nav = f.getByTestId("nav");
    await expect(nav).toHaveClass(/bg-transparent/, { timeout: 60_000 });
    await f.getByText("How long does it take?").scrollIntoViewIfNeeded();
    await expect(nav).toHaveClass(/bg-white/);
  });

  test("the accordion opens one answer at a time", async ({ page }) => {
    const f = frame(page);
    const q1 = f.getByRole("button", { name: /How long does it take/ });
    const q2 = f.getByRole("button", { name: /Do you ship worldwide/ });
    await expect(q1).toHaveAttribute("aria-expanded", "true", { timeout: 60_000 });
    await q2.scrollIntoViewIfNeeded();
    await q2.click();
    await expect(q2).toHaveAttribute("aria-expanded", "true");
    await expect(q1).toHaveAttribute("aria-expanded", "false");
  });

  test("a carousel slide opens the lightbox, and Escape closes it", async ({ page }) => {
    const f = frame(page);
    const slide = f.getByRole("button", { name: "Shot 2" });
    await slide.scrollIntoViewIfNeeded();
    await slide.click();
    const box = f.getByRole("dialog", { name: "Shot 2" });
    await expect(box).toBeVisible();
    await f.getByRole("button", { name: "Next image" }).click();
    await expect(f.getByRole("dialog", { name: "Shot 3" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(f.getByRole("dialog")).toBeHidden();
  });

  test("the review screenshot shows every section in its final state", async ({ page }) => {
    // Sections below the fold are still hidden (opacity 0) until the screenshot code reveals them.
    const shots: string[] = [];
    await page.route("**/api/generate", (route) => {
      try {
        const b = JSON.parse(route.request().postData() ?? "{}");
        shots.push(...(b.messages.at(-1).images ?? []));
      } catch {}
      return route.fulfill({ status: 200, contentType: "text/plain", body: KIT_REPLY });
    });
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: "Site health report" }).click();
    await page.getByRole("button", { name: "Visual review with AI" }).click();
    await expect.poll(() => shots.length, { timeout: 90_000 }).toBeGreaterThanOrEqual(2);
    expect(shots[0].length).toBeGreaterThan(5000);
  });
});

test.describe("layout measuring", () => {
  // The canned Hero plus one box pushed 96px past the left edge of the screen.
  const STRAY_REPLY = CANNED_REPLY.replace(
    "<Hero />",
    '<Hero /><div className="absolute -left-24 top-40 h-24 w-24 bg-red-500">STRAY</div>'
  ).replace('className="min-h-screen bg-brand-50"', 'className="relative min-h-screen bg-brand-50"');

  test("the health report flags an element that sticks out past the screen edge", async ({ page }) => {
    await mockAI(page, { reply: STRAY_REPLY });
    await buildSite(page);
    await expect(page.frameLocator('iframe[title="Preview"]').getByText("STRAY")).toBeAttached();
    await settled(page);
    await page.getByRole("button", { name: "Site health report" }).click();
    const row = page.getByText("Nothing sticks out past the screen edge");
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/element\(s\) are cut off, for example <div class="absolute -left-24/)).toBeVisible();
  });

  test("the visual review sends the measured problems along with the screenshots", async ({ page }) => {
    const requests = await mockAI(page, { reply: STRAY_REPLY });
    await buildSite(page);
    await expect(page.frameLocator('iframe[title="Preview"]').getByText("STRAY")).toBeAttached();
    await settled(page);
    await page.getByRole("button", { name: "Site health report" }).click();
    await page.getByRole("button", { name: "Visual review with AI" }).click();
    await expect.poll(() => requests.length, { timeout: 90_000 }).toBeGreaterThanOrEqual(2);
    const last = requests[requests.length - 1].messages.at(-1)!;
    expect(last.images).toHaveLength(2);
    expect(last.content).toMatch(/these layout problems were found/);
    expect(last.content).toMatch(/sticks out past the screen edge: <div class="absolute -left-24/);
  });
});

test.describe("long screenshots", () => {
  test("a tall screenshot is cut into slices and the model is told to read them as one page", async ({ page }) => {
    const requests = await mockAI(page);
    await page.goto("/");
    // A 600 x 3600 "full-page screenshot", made in the browser and handed to the file input.
    await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 600;
      c.height = 3600;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 600, 3600);
      ctx.fillStyle = "#000";
      ctx.font = "40px sans-serif";
      for (let i = 0; i < 9; i++) ctx.fillText("Section " + (i + 1), 20, 100 + i * 400);
      const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "long.png", { type: "image/png" }));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.locator('img[alt="attachment"]')).toHaveCount(4); // the most images a message can carry
    await page.getByPlaceholder(/landing page for a coffee shop/i).fill("Recreate this page");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/project\//);
    await expect.poll(() => requests.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
    const first = requests[0].messages[0];
    expect(first.images).toHaveLength(4);
    expect(first.content).toMatch(/consecutive vertical slices of one long screenshot/);
  });

  test("a normal screenshot stays one image and adds no note", async ({ page }) => {
    const requests = await mockAI(page);
    await page.goto("/");
    await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 1200;
      c.height = 800;
      c.getContext("2d")!.fillRect(0, 0, 1200, 800);
      const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "screen.png", { type: "image/png" }));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.locator('img[alt="attachment"]')).toHaveCount(1);
    await page.getByPlaceholder(/landing page for a coffee shop/i).fill("Recreate this page");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/project\//);
    await expect.poll(() => requests.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
    expect(requests[0].messages[0].images).toHaveLength(1);
    expect(requests[0].messages[0].content).not.toMatch(/consecutive vertical slices/);
  });
});

test.describe("building a site (AI mocked)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAI(page);
    await buildSite(page);
  });

  test("the generated site appears in the preview", async ({ page }) => {
    const preview = page.frameLocator('iframe[title="Preview"]');
    await expect(preview.getByRole("heading", { name: "Small-batch coffee, roasted daily." })).toBeVisible();
    await expect(preview.getByText("Harbor Coffee")).toBeVisible();
    // The long list of written files folds into one line.
    await expect(page.getByText("5 files written")).toBeVisible();
  });

  test("a fresh build uses the theme's brand color and fonts, not the default indigo", async ({ page }) => {
    // The canned theme is brand #92400e; Hero's button is bg-brand-600. The page that loads while the AI
    // writes starts with the default theme, so the preview has to reload once at the end of the build.
    const hex = brandScale("#92400e")["600"];
    const rgb = `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
    const button = page.frameLocator('iframe[title="Preview"]').getByRole("button", { name: "Shop beans" });
    await expect(button).toHaveCSS("background-color", rgb);
    await expect(page.frameLocator('iframe[title="Preview"]').getByRole("heading", { name: /Small-batch/ })).toHaveCSS(
      "font-family",
      /Playfair Display/
    );
  });

  test("design tool popovers open, close with Esc and give focus back", async ({ page }) => {
    await expect(page.frameLocator('iframe[title="Preview"]').getByText("Harbor Coffee")).toBeVisible();
    const health = page.getByRole("button", { name: "Site health report" });
    await health.click();
    await expect(page.getByRole("dialog", { name: "Site health report" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Site health report" })).toBeHidden();
    await expect(health).toBeFocused();
  });

  test("the code tab lists files with line numbers", async ({ page }) => {
    await page.getByRole("tab", { name: "Code" }).click();
    await expect(page.getByRole("navigation", { name: "Project files" }).getByText("/App.js")).toBeVisible();
    await expect(page.getByText(/\d+ lines/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy file contents" })).toBeVisible();
  });

  test("? opens the keyboard shortcuts and Esc closes them", async ({ page }) => {
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Shift+Slash");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeHidden();
  });
});

test.describe("automatic visual review", () => {
  test("after the first build the app screenshots the site and sends it to the AI once", async ({ page }) => {
    const requests = await mockAI(page, { review: true });
    await buildSite(page);
    // The chat shows a short label with the screenshots, not the long prompt.
    await expect(page.getByText("Automatic visual review of the finished site (screenshots attached)")).toBeVisible({ timeout: 80_000 });
    await expect.poll(() => requests.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
    const last = requests[requests.length - 1].messages.at(-1)!;
    expect(last.images).toHaveLength(2); // desktop and phone
    expect(last.content).toMatch(/visual design review/i);
    // One review only: a short wait does not produce another one.
    await page.waitForTimeout(8000);
    expect(requests.filter((r) => r.messages.at(-1)?.images?.length).length).toBe(1);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("one pane at a time with a bottom tab bar and no sideways scrolling", async ({ page }) => {
    await mockAI(page);
    await buildSite(page);

    const bar = page.getByRole("navigation", { name: "Switch between chat and preview" });
    await expect(bar).toBeVisible();
    // Chat first, and it fits the screen.
    await expect(page.getByLabel("Message the AI")).toBeVisible();
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(await fits()).toBe(true);

    await bar.getByRole("button", { name: "Preview" }).click();
    const preview = page.frameLocator('iframe[title="Preview"]');
    await expect(preview.getByRole("heading", { name: "Small-batch coffee, roasted daily." })).toBeVisible();
    const box = await page.locator('iframe[title="Preview"]').boundingBox();
    expect(box!.width).toBeGreaterThan(300);
    expect(await fits()).toBe(true);

    await bar.getByRole("button", { name: "Chat" }).click();
    await expect(page.getByLabel("Message the AI")).toBeVisible();
  });
});
