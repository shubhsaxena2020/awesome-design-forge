import { describe, it, expect } from "vitest";
import { loadAllSpecs } from "../../brands/tokens.ts";
import { selectSeedBrands, classify, type SeedTrait } from "../../../packages/preview/e2e/seeds.ts";

describe("visual seed subset: roadmap #4 (offline, no browser)", () => {
  const { specs } = loadAllSpecs();
  const ids = new Set(specs.map((s) => s.id));

  it("every seed id resolves to a baked spec (harness can never reference a missing brand)", () => {
    const seeds = selectSeedBrands();
    expect(seeds.length).toBeGreaterThan(0);
    for (const s of seeds) expect(ids.has(s.id), `seed ${s.id} missing from baked specs`).toBe(true);
  });

  it("seed set covers all required trait categories (light/dark, high/low-contrast, dense/sparse)", () => {
    const seeds = selectSeedBrands();
    const covered = new Set<SeedTrait>();
    for (const s of seeds) for (const t of s.traits) covered.add(t);
    for (const need of ["light", "dark", "high-contrast", "low-contrast", "dense", "sparse"] as SeedTrait[]) {
      expect(covered.has(need), `no seed covers trait "${need}"`).toBe(true);
    }
  });

  it("classify is pure + deterministic", () => {
    const sample = specs[0];
    expect(classify(sample)).toEqual(classify(sample));
  });
});
