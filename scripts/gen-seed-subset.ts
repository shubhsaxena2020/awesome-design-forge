/**
 * Regenerate the visual-regression seed subset (backlog D17).
 *
 * The Playwright harness (`packages/preview/e2e/visual.spec.ts`) screenshots a
 * REPRESENTATIVE subset of brands rather than all 84, to keep baselines small and
 * meaningful. `selectSeedBrands()` derives that subset from the baked specs at
 * runtime, so as the corpus grows the seed set stays valid automatically.
 *
 * This script materialises the current subset to JSON so it can be committed /
 * diffed / replayed deterministically (e.g. to detect when a corpus change would
 * silently drop or add a seed brand). Run with: `pnpm gen:seed-subset`.
 */
import { selectSeedBrands, type SeedBrand } from "../packages/preview/e2e/seeds.ts";
import * as fs from "node:fs";
import * as path from "node:path";

const seeds: SeedBrand[] = selectSeedBrands();
const out = path.join(process.cwd(), "packages", "preview", "e2e", "seed-subset.json");

const payload = {
  generatedAt: new Date().toISOString(),
  count: seeds.length,
  seeds,
};

fs.writeFileSync(out, JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${seeds.length} seed brands -> ${out}`);
for (const s of seeds) console.log(`  - ${s.id} [${s.traits.join(", ")}]`);
