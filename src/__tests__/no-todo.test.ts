import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Guard (backlog B4): keep `src/` free of TODO/FIXME markers. A lingering
 * TODO is a tracked task that should live in the issue tracker / BACKLOG.md,
 * not in shipped code. This test fails the moment one is reintroduced.
 */
describe("source hygiene: no TODO/FIXME in src/", () => {
  function walk(dir: string, acc: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp, acc);
      else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) acc.push(fp);
    }
    return acc;
  }

  it("contains zero TODO/FIXME markers across src/", () => {
    const root = path.resolve(__dirname, "..");
    const files = walk(root);
    const hits: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      for (const m of text.matchAll(/^\s*(TODO|FIXME)\b.*$/gm)) {
        hits.push(`${path.relative(root, f)}: ${m[0].trim()}`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
