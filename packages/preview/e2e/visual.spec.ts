/**
 * Visual-regression suite for the design-forge interactive preview showroom.
 *
 * NOTE (offline / network constraint): this spec requires Playwright browser
 * binaries, which are NOT present on the build VPS (the cached chromium fails to
 * launch — missing system libs `libnss3`/`libdbus`/`libxkbcommon`/`libgbm`/
 * `libasound`, and there is no root/network for `playwright install --with-deps`).
 * So this file is AUTHORED but NOT executed here. It is fully turnkey on a
 * capable host: `pnpm exec playwright install chromium && pnpm test:visual`.
 *
 * To keep CI green on this VPS, the entire suite SELF-SKIPS when the browser
 * cannot actually launch (detected up front), instead of erroring. On a capable
 * host the same detection passes and the real screenshots run.
 *
 * The showroom renders a side-by-side view (input spec · tokens · output) per
 * brand via `?brand=<id>`, and a token-diff view via `?diff=<idA>,<idB>`.
 *
 * We screenshot a REPRESENTATIVE SEED SUBSET (roadmap #4) — light/dark,
 * high/low-contrast, dense/sparse — rather than all 150+ brands, to keep the
 * baseline set small and meaningful. `selectSeedBrands()` derives it from the
 * baked specs, so it stays valid as the corpus grows.
 */

import { test, expect } from "@playwright/test";
import { chromium } from "@playwright/test";
import { selectSeedBrands } from "./seeds.ts";

/**
 * Detect whether a real Chromium can launch on this host. Returns false on the
 * build VPS (missing system libs) so the suite can skip instead of fail.
 */
async function canLaunchChromium(): Promise<boolean> {
  try {
    const browser = await chromium.launch();
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

const browserAvailable = await canLaunchChromium();
if (!browserAvailable) {
  // eslint-disable-next-line no-console
  console.warn(
    "[visual.spec] Skipping: chromium cannot launch on this host " +
      "(missing system libs). Runs on a capable host / CI `visual` job.",
  );
}

const seeds = selectSeedBrands();

test.describe("visual regression (design-forge showroom)", () => {
  test.skip(!browserAvailable, "chromium unavailable on this host");

  for (const seed of seeds) {
    test(`brand "${seed.id}" (${seed.traits.join(", ")}) renders without layout drift`, async ({ page }) => {
      await page.goto(`/?brand=${seed.id}`);
      await page.waitForSelector("text=design-forge preview");
      // wait for the per-brand theme <style id="df-theme"> to be injected
      await page.waitForFunction(() => {
        const el = document.getElementById("df-theme");
        return !!el && el.textContent != null && el.textContent.includes("--color-primary");
      });
      await expect(page).toHaveScreenshot(`${seed.id}.png`, { maxDiffPixelRatio: 0.02 });
    });
  }
});
