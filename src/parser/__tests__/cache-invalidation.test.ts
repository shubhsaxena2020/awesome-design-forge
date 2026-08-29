import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseDesignMdCached, clearSpecCache, specCacheStats } from "../../parser/cache.ts";

/**
 * Backlog B9: the parsed-spec cache must invalidate correctly.
 * Strategy under test: a cache hit is reused only if BOTH mtime AND size still
 * match; any change forces a re-parse. `clearSpecCache()` drops everything.
 */
describe("cache layer invalidation (backlog B9)", () => {
  let dir: string;
  beforeEach(() => {
    clearSpecCache();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "df-cache-"));
  });
  afterEach(() => {
    clearSpecCache();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (name: string, body: string) => {
    const f = path.join(dir, name);
    fs.writeFileSync(f, body);
    return f;
  };

  it("records an entry on first parse and reports stats", async () => {
    const f = write("a.md", `---\nname: A\nid: a\ncolors:\n  primary: "#123abc"\n---\n`);
    await parseDesignMdCached(f);
    expect(specCacheStats().size).toBe(1);
    expect(specCacheStats().entries).toContain(f);
  });

  it("returned object is reference-identical on a hit (true memoization)", async () => {
    const f = write("b.md", `---\nname: B\nid: b\ncolors:\n  primary: "#123abc"\n---\n`);
    const s1 = await parseDesignMdCached(f);
    const s2 = await parseDesignMdCached(f);
    expect(s2).toBe(s1);
  });

  it("re-parses when the file CONTENT changes (size + mtime shift)", async () => {
    const f = write("c.md", `---\nname: C\nid: c\ncolors:\n  primary: "#111111"\n---\n`);
    const s1 = await parseDesignMdCached(f);
    // ensure a distinct mtime so the invalidation check is meaningful
    await new Promise((r) => setTimeout(r, 15));
    fs.writeFileSync(f, `---\nname: C2\nid: c\ncolors:\n  primary: "#222222"\n---\n`);
    const s2 = await parseDesignMdCached(f);
    expect(s2).not.toBe(s1);
    expect(s2.name).toBe("C2");
    expect(s2.colors.primary).toBe("#222222");
    expect(specCacheStats().size).toBe(1); // same path -> entry replaced, not duplicated
  });

  it("clearSpecCache empties the store and forces a fresh parse", async () => {
    const f = write("d.md", `---\nname: D\nid: d\ncolors:\n  primary: "#333333"\n---\n`);
    const s1 = await parseDesignMdCached(f);
    clearSpecCache();
    expect(specCacheStats().size).toBe(0);
    const s2 = await parseDesignMdCached(f);
    expect(s2).not.toBe(s1);
    expect(s2.colors.primary).toBe("#333333");
  });
});
