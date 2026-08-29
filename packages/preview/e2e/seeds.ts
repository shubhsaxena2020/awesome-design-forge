/**
 * Visual-regression seed set for the Playwright harness (roadmap #3 + #4).
 *
 * The full corpus is 150+ brands; screenshotting all of them every run is
 * slow and noisy. Instead we seed the harness with a REPRESENTATIVE SUBSET
 * that exercises the interesting rendering cases:
 *   - light vs dark backgrounds
 *   - high-contrast (AAA-ish) vs low-contrast
 *   - dense-token (many extra palette colors / typography roles)
 *   - sparse-token (minimal palette)
 *
 * `selectSeedBrands()` derives the seeds from the baked specs at runtime, so the
 * list stays valid as the corpus grows. `classify()` is pure + offline and is
 * unit-tested so a seed can never reference a missing brand id.
 */

import { loadAllSpecs } from "../../../src/brands/tokens.ts";
import type { DesignSpec } from "../../../src/spec/types.ts";

export type SeedTrait = "light" | "dark" | "high-contrast" | "low-contrast" | "dense" | "sparse";

export interface SeedBrand {
  id: string;
  name: string;
  traits: SeedTrait[];
}

/** Classify a spec by background luminance, contrast, and token density. */
export function classify(spec: DesignSpec): SeedTrait[] {
  const traits: SeedTrait[] = [];
  const bg = (spec.colors.background || "#ffffff").toLowerCase();
  const isDark = bg.startsWith("#") ? parseInt(bg.slice(1, 3), 16) < 128 : false;
  traits.push(isDark ? "dark" : "light");

  // crude offline contrast: parse hex bg/fg luminance
  const lum = (hex: string): number => {
    const h = hex.replace("#", "");
    if (h.length < 6) return 1;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const f = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const lb = lum(spec.colors.background);
  const lf = lum(spec.colors.foreground);
  const ratio = (Math.max(lb, lf) + 0.05) / (Math.min(lb, lf) + 0.05);
  traits.push(ratio >= 7 ? "high-contrast" : "low-contrast");

  const colorCount =
    Object.keys(spec.colors).filter((k) => k !== "extra").length +
    Object.keys(spec.colors.extra ?? {}).length;
  const roleCount = Object.keys(spec.typography.roles ?? {}).length;
  const density = colorCount + roleCount;
  if (density >= 12) traits.push("dense");
  if (density <= 8) traits.push("sparse");

  return traits;
}

/** Pick a representative seed set: at least one brand per trait, deduped. */
export function selectSeedBrands(): SeedBrand[] {
  const { specs } = loadAllSpecs();
  const byTrait: Record<SeedTrait, DesignSpec[]> = {
    light: [], dark: [], "high-contrast": [], "low-contrast": [], dense: [], sparse: [],
  };
  for (const s of specs) {
    for (const t of classify(s)) byTrait[t].push(s);
  }
  const picked = new Map<string, SeedBrand>();
  (Object.keys(byTrait) as SeedTrait[]).forEach((t) => {
    const list = byTrait[t];
    if (!list.length) return;
    // pick up to 2 representatives per trait (first + one with the most colors)
    const rep = list[0];
    picked.set(rep.id, { id: rep.id, name: rep.name, traits: classify(rep) });
    if (list.length > 1) {
      const second = [...list].sort(
        (a, b) =>
          Object.keys(b.colors).length + Object.keys(b.colors.extra ?? {}).length -
          (Object.keys(a.colors).length + Object.keys(a.colors.extra ?? {}).length),
      )[0];
      picked.set(second.id, { id: second.id, name: second.name, traits: classify(second) });
    }
  });
  return [...picked.values()];
}
