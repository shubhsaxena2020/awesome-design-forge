/**
 * Benchmark: ingest time for the full 84-source `design-md/` corpus.
 *
 * Backlog D16. Measures the real wall-clock cost of re-baking the registry so
 * the cost of `pnpm gen:brands` / `design-forge ingest` is documented, not
 * guessed. Run with: `pnpm bench:ingest`.
 *
 * Offline and deterministic-ish (cached fs ops dominate). Prints a markdown-ish
 * line plus a machine-readable JSON summary.
 */
import { ingestDirSpecs } from "../src/brands/ingest.ts";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const CORPUS = path.join(ROOT, "design-md");

function countMd(d: string): number {
  let n = 0;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    if (e.isDirectory()) n += countMd(fp);
    else if (e.name.endsWith(".md")) n++;
  }
  return n;
}

async function main(): Promise<void> {
  if (!fs.existsSync(CORPUS)) {
    console.error(`corpus not found at ${CORPUS}`);
    process.exit(1);
  }
  const fileCount = countMd(CORPUS);

  // time the real ingest (module cache already warm from import)
  const t0 = performance.now();
  const { brands, files } = await ingestDirSpecs(CORPUS);
  const t1 = performance.now();
  const ms = t1 - t0;

  console.log(`| ingest (${brands.length} specs / ${fileCount} .md files, ${files} walked) | ${ms.toFixed(1)} ms | ${brands.length} brands baked |`);
  console.log(
    JSON.stringify({ specs: brands.length, mdFiles: fileCount, walked: files, brands: brands.length, ms: Number(ms.toFixed(2)) }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
