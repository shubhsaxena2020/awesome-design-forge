/**
 * Parsed-spec + generated-artifact cache.
 *
 * Roadmap item #8: keep batch runs fast across the (now 150+) brand set.
 *
 * Strategy:
 *  - A process-level Map caches `DesignSpec` by absolute file path.
 *  - Each entry records the file's mtimeMs + size at parse time; a cache hit is
 *    only reused if BOTH still match (cheap, accurate invalidation — no hash
 *    needed). If the file changed, it is re-parsed and the entry refreshed.
 *  - `clearSpecCache()` drops everything (used in ingest to force a clean bake).
 *
 * `parseDesignMdCached` is a drop-in for `parseDesignMd` that adds caching.
 * The parser itself is unchanged, so valid specs remain identical (the cache
 * only memoizes).
 */

import * as fs from "node:fs";
import { parseDesignMd } from "./design-parser.ts";
import type { DesignSpec } from "../spec/types.ts";

interface CacheEntry {
  mtime: number;
  size: number;
  spec: DesignSpec;
}

const specCache = new Map<string, CacheEntry>();

function statSafe(file: string): { mtime: number; size: number } | null {
  try {
    const s = fs.statSync(file);
    return { mtime: s.mtimeMs, size: s.size };
  } catch {
    return null;
  }
}

/** Parse a brand spec, returning a cached result if the file is unchanged. */
export async function parseDesignMdCached(filePath: string): Promise<DesignSpec> {
  const abs = filePath;
  const st = statSafe(abs);
  const hit = specCache.get(abs);
  if (hit && st && hit.mtime === st.mtime && hit.size === st.size) {
    return hit.spec;
  }
  const spec = await parseDesignMd(abs);
  if (st) specCache.set(abs, { mtime: st.mtime, size: st.size, spec });
  return spec;
}

/** Cache stats (for tests / CLI reporting). */
export function specCacheStats(): { size: number; entries: string[] } {
  return { size: specCache.size, entries: [...specCache.keys()] };
}

/** Drop all cached specs (forces re-parse). */
export function clearSpecCache(): void {
  specCache.clear();
}
