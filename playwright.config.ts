import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 1,
  snapshotDir: "./e2e/__screenshots__",
  use: {
    baseURL: "http://localhost:5180",
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm exec vite --port 5180",
    url: "http://localhost:5180",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
