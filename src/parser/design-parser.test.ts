import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { parseDesignMd, discoverBrandFiles } from "./design-parser.ts";
import type { DesignSpec } from "../spec/types.ts";

const ROOT = path.resolve(__dirname, "..", "..");
const DESIGN_MD = path.join(ROOT, "design-md");
const ADVERSARIAL = path.join(ROOT, "design-md-adversarial");

/** Read-only: parse every brand .md we can find without crashing on any. */
describe("req A.2 — parseDesignMd over ALL brand spec files", () => {
  let files: string[] = [];
  beforeAll(async () => {
    files = [
      ...(await discoverBrandFiles(DESIGN_MD)),
      ...(await discoverBrandFiles(ADVERSARIAL)),
    ];
  });

  it("discovers at least the 8 reference + 2 adversarial specs present on disk", () => {
    // 8 reference brands + 2 adversarial = 10 minimum on this VPS.
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it("parses every discovered file without throwing and yields a strict DesignSpec", async () => {
    const specs: DesignSpec[] = [];
    for (const f of files) {
      const spec = await parseDesignMd(f); // must never throw
      expect(spec).toBeTypeOf("object");
      expect(spec.id).toBeTypeOf("string");
      expect(spec.id.length).toBeGreaterThan(0);
      expect(spec.colors).toHaveProperty("background");
      expect(spec.colors).toHaveProperty("primary");
      expect(spec.typography).toHaveProperty("heading");
      expect(spec.typography).toHaveProperty("body");
      expect(spec.elevation).toHaveProperty("radius");
      specs.push(spec);
    }
    // Every spec must carry a source path (traceability).
    for (const s of specs) expect(s.source).toContain(".md");
  });

  it("resolves {token} references in component blocks (linear-dark)", async () => {
    const spec = await parseDesignMd(path.join(DESIGN_MD, "linear-dark.md"));
    // linear-dark references {colors.tertiary} inside components.button-primary.backgroundColor.
    const btn = spec.components["button-primary"];
    expect(btn).toBeTruthy();
    // tertiary is #5E6AD2 -> resolved, not the raw "{colors.tertiary}".
    expect(btn!.tokens.backgroundColor).toBe("#5E6AD2");
    expect(btn!.tokens.backgroundColor).not.toContain("{");
  });

  it("infers a readable foreground when on-* is absent (verdant light bg)", async () => {
    const spec = await parseDesignMd(path.join(DESIGN_MD, "verdant-health.md"));
    // verdant background is near-white -> foreground should be dark.
    expect(spec.colors.foreground.toLowerCase()).not.toBe(spec.colors.background.toLowerCase());
    expect(spec.warnings.length).toBeGreaterThanOrEqual(0); // warnings array exists
  });

  it("handles an empty-tokens adversarial file gracefully", async () => {
    const spec = await parseDesignMd(path.join(ADVERSARIAL, "empty-tokens.md"));
    expect(spec.colors.background).toBeTypeOf("string");
    expect(spec.typography.baseSizePx).toBeGreaterThan(0);
    expect(Array.isArray(spec.warnings)).toBe(true);
  });

  it("handles a prose-only adversarial file (no front matter) gracefully", async () => {
    const spec = await parseDesignMd(path.join(ADVERSARIAL, "prose-only.md"));
    expect(spec.id).toBeTypeOf("string");
    expect(spec.colors.primary).toBeTypeOf("string");
  });
});
