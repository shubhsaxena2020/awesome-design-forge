/**
 * Visual-regression suite for the design-forge interactive preview showroom.
 *
 * NOTE (offline / network constraint): this spec requires Playwright browser
 * binaries, which are NOT present on a fully-offline host. Run
 *   pnpm exec playwright install chromium
 * once (needs network), then `pnpm test:visual`. Until then this file is
 * authored-but-not-executed; it is NOT counted as a passing test.
 *
 * What it does: loads the showroom for every baked brand (?brand=<id>), lets
 * the injected theme + fonts settle, then asserts a deterministic baseline
 * screenshot so future theme changes are caught as pixel diffs.
 */
import { test, expect } from "@playwright/test";
import { loadAllBrands } from "../../../src/brands/tokens.ts";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:5180";

const brands = loadAllBrands().brands;

test.describe("preview visual regression", () => {
  for (const b of brands) {
    test(`brand "${b.id}" renders without layout thrash and matches baseline`, async ({ page }) => {
      await page.goto(`${BASE}/?brand=${b.id}`);
      // Wait for the theme <style id="df-theme"> to be injected and fonts to load.
      await page.waitForSelector("#df-theme");
      await page.evaluate(() => document.fonts?.ready);
      // Sanity: the brand primary actually made it into the live theme.
      const theme = await page.$eval("#df-theme", (el) => (el as HTMLStyleElement).textContent ?? "");
      expect(theme).toContain(`--primary:`);
      // Toggle dark mode and re-shoot to widen coverage.
      await page.evaluate(() => document.documentElement.classList.add("dark"));
      await page.waitForTimeout(150);
      await expect(page).toHaveScreenshot(`${b.id}.png`, { fullPage: true, maxDiffPixelRatio: 0.02 });
    });
  }
});
