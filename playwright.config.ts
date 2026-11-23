import { defineConfig, devices } from "@playwright/test";

// End-to-end tests drive the real app in Chromium. The AI is mocked (see e2e/helpers.ts), so they
// are fast, free and deterministic. The preview itself still loads Tailwind, Babel and React from
// CDNs, so they need internet access.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 45_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI builds first (see .github/workflows/ci.yml), so it can start the production server.
    command: process.env.CI ? "npm start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
