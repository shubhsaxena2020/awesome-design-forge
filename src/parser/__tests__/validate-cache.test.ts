import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { validateDesignSpec, assertValidDesignSpec, SpecValidationError, formatValidationReport } from "../../parser/validate.ts";
import { parseDesignMdCached, clearSpecCache, specCacheStats } from "../../parser/cache.ts";
import type { DesignSpec } from "../../spec/types.ts";

function makeValidSpec(over: Partial<DesignSpec> = {}): DesignSpec {
  return {
    id: "demo",
    name: "Demo",
    description: "demo",
    source: "memory",
    colors: {
      background: "#ffffff",
      foreground: "#0a0a0a",
      primary: "#2563eb",
      onPrimary: "#ffffff",
      secondary: "#6b7280",
      onSecondary: "#ffffff",
      accent: "#7c3aed",
      onAccent: "#ffffff",
      muted: "#f3f4f6",
      onMuted: "#111827",
      destructive: "#b91c1c",
      onDestructive: "#ffffff",
      border: "#e5e7eb",
    },
    typography: {
      heading: { fontFamily: "Inter", fontStack: ["Inter", "sans-serif"], fontSizePx: 32 },
      body: { fontFamily: "Inter", fontStack: ["Inter", "sans-serif"], fontSizePx: 16 },
      baseSizePx: 16,
    },
    elevation: { radius: "0.5rem" },
    components: {},
    warnings: [],
    ...over,
  };
}

describe("validate: item #2 explicit spec validation", () => {
  it("passes a well-formed spec and leaves it unchanged", () => {
    const spec = makeValidSpec();
    const errors = validateDesignSpec(spec);
    expect(errors).toHaveLength(0);
    // pure function: no mutation
    expect(spec.id).toBe("demo");
  });

  it("flags a missing id and a bad id", () => {
    expect(validateDesignSpec(makeValidSpec({ id: "" }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "id" })]),
    );
    expect(validateDesignSpec(makeValidSpec({ id: "Bad ID!" }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "id" })]),
    );
  });

  it("flags an invalid color", () => {
    const errors = validateDesignSpec(makeValidSpec({ colors: { ...makeValidSpec().colors, primary: "not-a-color" } }));
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ path: "colors.primary" })]));
  });

  it("flags a non-AA primary/foreground contrast (offline-computable hex)", () => {
    const errors = validateDesignSpec(
      makeValidSpec({ colors: { ...makeValidSpec().colors, background: "#ffffff", foreground: "#f1f1f1" } }),
    );
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ path: "colors.background/foreground" })]));
  });

  it("does NOT false-flag oklch colors it cannot compute offline", () => {
    const errors = validateDesignSpec(
      makeValidSpec({ colors: { ...makeValidSpec().colors, primary: "oklch(0.6 0.2 250)", onPrimary: "oklch(0.98 0.01 250)" } }),
    );
    expect(errors.find((e) => e.path.includes("colors.primary"))).toBeUndefined();
  });

  it("assertValidDesignSpec throws a grouped error; formatValidationReport is readable", () => {
    expect(() => assertValidDesignSpec(makeValidSpec({ id: "" }))).toThrow(SpecValidationError);
    const r = formatValidationReport(makeValidSpec({ id: "" }));
    expect(r.ok).toBe(false);
    expect(r.lines.join("\n")).toContain("id");
  });
});

describe("cache: item #8 parsed-spec cache", () => {
  let dir: string;
  beforeEach(() => {
    clearSpecCache();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "df-cache-"));
  });
  afterEach(() => {
    clearSpecCache();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("reuses a cached parse on the same unchanged file (fast path)", async () => {
    const f = path.join(dir, "a.md");
    fs.writeFileSync(
      f,
      `---\nname: A\nid: a\ncolors:\n  primary: "#123abc"\n---\n`,
    );
    const s1 = await parseDesignMdCached(f);
    const before = specCacheStats().size;
    const s2 = await parseDesignMdCached(f);
    expect(before).toBe(1);
    expect(s2).toBe(s1); // same reference = cache hit
  });

  it("invalidates and re-parses when the file changes", async () => {
    const f = path.join(dir, "b.md");
    fs.writeFileSync(f, `---\nname: B\nid: b\ncolors:\n  primary: "#111111"\n---\n`);
    const s1 = await parseDesignMdCached(f);
    fs.writeFileSync(f, `---\nname: B2\nid: b\ncolors:\n  primary: "#222222"\n---\n`);
    const s2 = await parseDesignMdCached(f);
    expect(s2).not.toBe(s1);
    expect(s2.name).toBe("B2");
  });
});
