import { describe, it, expect } from "vitest";
import {
  diffTokens,
  diffSpecs,
  flattenTokens,
  flattenSpec,
  summarizeDiff,
  formatDiff,
} from "../../transformers/token-diff.ts";
import type { BrandTokens } from "../../brands/tokens.ts";
import type { DesignSpec } from "../../spec/types.ts";

function mkBrand(over: Partial<BrandTokens>): BrandTokens {
  return {
    id: "x",
    name: "X",
    description: "",
    radius: "0.5rem",
    colors: {
      background: "#ffffff",
      foreground: "#101010",
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
      extra: {},
    },
    typography: { heading: "Inter", body: "Inter", baseSize: 16 },
    components: {},
    warnings: [],
    ...over,
  } as BrandTokens;
}

function mkSpec(over: Partial<DesignSpec>): DesignSpec {
  return {
    id: "x",
    name: "X",
    description: "",
    source: "memory",
    colors: {
      background: "#ffffff",
      foreground: "#101010",
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
      heading: { fontFamily: "Inter", fontStack: ["Inter"], fontSizePx: 32 },
      body: { fontFamily: "Inter", fontStack: ["Inter"], fontSizePx: 16 },
      baseSizePx: 16,
    },
    elevation: { radius: "0.5rem" },
    components: {},
    warnings: [],
    ...over,
  } as DesignSpec;
}

describe("token-diff engine coverage (backlog B7)", () => {
  it("diffTokens classifies added/removed/changed/unchanged", () => {
    const a = mkBrand({});
    const b = mkBrand({
      colors: { ...mkBrand({}).colors, primary: "#ff0000", accent: "#00ff00" } as never,
    });
    // 'added' case: a brand that carries an extra top-level color key `ring`
    const withExtra = mkBrand({
      colors: { ...mkBrand({}).colors, ring: "#abcdef" } as never,
    } as never);
    const d = diffTokens(a, withExtra);
    expect(d.some((ch) => ch.kind === "added" && ch.path === "colors.ring")).toBe(true);

    const changed = diffTokens(a, b);
    expect(changed.find((ch) => ch.path === "colors.primary")?.kind).toBe("changed");
    expect(changed.find((ch) => ch.path === "colors.accent")?.kind).toBe("changed");

    const removed = diffTokens(withExtra, a);
    expect(removed.some((ch) => ch.kind === "removed" && ch.path === "colors.ring")).toBe(true);

    // unchanged present
    expect(changed.find((ch) => ch.path === "colors.background")?.kind).toBe("unchanged");
  });

  it("diffSpecs works on DesignSpecs (not just BrandTokens)", () => {
    const a = mkSpec({});
    const b = mkSpec({ colors: { ...mkSpec({}).colors, primary: "#abcdef" } as never });
    const d = diffSpecs(a, b);
    expect(d.find((ch) => ch.path === "colors.primary")?.kind).toBe("changed");
    expect(d.find((ch) => ch.path === "typography.heading.fontFamily")?.kind).toBe("unchanged");
  });

  it("flattenTokens captures colors + radius + typography", () => {
    const f = flattenTokens(mkBrand({ radius: "1rem" }));
    expect(f["colors.primary"]).toBe("#2563eb");
    expect(f["radius"]).toBe("1rem");
    expect(f["typography.heading"]).toBe("Inter");
    expect(f["typography.baseSize"]).toBe("16");
  });

  it("flattenSpec captures typography font families", () => {
    const f = flattenSpec(mkSpec({}));
    expect(f["typography.heading.fontFamily"]).toBe("Inter");
    expect(f["typography.body.fontFamily"]).toBe("Inter");
  });

  it("summarizeDiff counts each kind", () => {
    const a = mkBrand({});
    const b = mkBrand({ colors: { ...mkBrand({}).colors, primary: "#000000" } as never } as never);
    const withExtra = mkBrand({ colors: { ...mkBrand({}).colors, ring: "#111111" } as never } as never);
    const changes = [
      ...diffTokens(a, b), // one changed
      ...diffTokens(a, withExtra), // one added
    ];
    const s = summarizeDiff(changes);
    expect(s.changed).toBeGreaterThanOrEqual(1);
    expect(s.added).toBeGreaterThanOrEqual(1);
    expect(s.unchanged).toBeGreaterThan(0);
    expect(s.added + s.removed + s.changed + s.unchanged).toBe(changes.length);
  });

  it("formatDiff renders only changed when onlyChanged=true", () => {
    const a = mkBrand({});
    const b = mkBrand({ colors: { ...mkBrand({}).colors, primary: "#000000" } as never } as never);
    const out = formatDiff(diffTokens(a, b), { onlyChanged: true });
    expect(out.split("\n").length).toBeLessThan(diffTokens(a, b).length);
    expect(out).toContain("~ colors.primary");
    expect(out).not.toContain("colors.background");
  });
});
