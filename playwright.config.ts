import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./packages/preview/e2e",
  fullyParallel: true,
  retries: 1,
  snapshotDir: "./packages/preview/e2e/__screenshots__",
  use: {
    baseURL: "http://localhost:5180",
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Serve the showroom from its own package so the Tailwind v4 plugin applies.
    command: "pnpm exec vite --port 5180",
    cwd: "packages/preview",
    url: "http://localhost:5180",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
