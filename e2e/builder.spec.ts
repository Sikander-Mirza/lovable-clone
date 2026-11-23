import { expect, test } from "@playwright/test";
import { buildSite, mockAI } from "./helpers";

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
    await expect(page.getByText("4 files written")).toBeVisible();
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
