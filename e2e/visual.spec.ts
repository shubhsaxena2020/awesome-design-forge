import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import { loadAllBrands } from "../src/brands/tokens.ts";

const OUT = "e2e/__screenshots__";
const SPECS = path.resolve(process.env.DESIGN_MD_DIR || "design-md");
const BRANDS = loadAllBrands(fs.existsSync(SPECS) ? SPECS : undefined).brands;

// For every reference brand: boot the showroom, assert it renders without a
// runtime error, capture a clean baseline screenshot (light + dark).
for (const brand of BRANDS) {
  test(`showroom renders: ${brand.id} (dark)`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    await page.goto(`/?brand=${brand.id}`);
    // Wait for the generated theme <style> + brand heading to be present.
    await expect(page.getByRole("heading", { name: brand.name, level: 1 })).toBeVisible();
    await expect(page.locator("#df-theme")).toHaveCount(1);

    await page.waitForTimeout(400); // let fonts settle
    await page.screenshot({ path: `${OUT}/${brand.id}-dark.png`, fullPage: true });

    expect(errors, `runtime errors for ${brand.id}`).toEqual([]);
  });

  test(`showroom renders: ${brand.id} (light)`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto(`/?brand=${brand.id}`);
    await expect(page.getByRole("heading", { name: brand.name, level: 1 })).toBeVisible();
    // Flip to light mode via the toggle button (labeled "Light").
    await page.getByRole("button", { name: "Light" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${brand.id}-light.png`, fullPage: true });

    expect(errors, `runtime errors for ${brand.id} (light)`).toEqual([]);
  });
}
