import { describe, it, expect } from "vitest";
import {
  fontFamilyCss,
  emitTailwindFonts,
  fluidSize,
  emitFluidTypography,
  tightTrackingRoles,
  typographyReport,
} from "./typography-engine.ts";
import type { TypographyScale } from "../spec/types.ts";

function scaleWith(letterSpacingEm?: number): TypographyScale {
  return {
    heading: {
      fontFamily: "Inter",
      fontStack: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      fontSizePx: 48,
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacingEm,
    },
    body: {
      fontFamily: "Inter",
      fontStack: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      fontSizePx: 16,
      lineHeight: 1.5,
    },
    roles: {
      "label-caps": {
        fontFamily: "Inter",
        fontStack: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        fontSizePx: 12,
        fontWeight: 600,
        letterSpacingEm: 0.06,
      },
    },
    baseSizePx: 16,
  };
}

describe("req A.4 — typography & spacing scale generator", () => {
  it("builds a font-family CSS value with quoted multi-word families + fallbacks", () => {
    const css = fontFamilyCss(["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"]);
    expect(css).toContain('"Space Grotesk"');
    expect(css).toContain("system-ui");
  });

  it("emits Tailwind v4 @theme font declarations", () => {
    const out = emitTailwindFonts(scaleWith());
    expect(out).toContain("--font-heading:");
    expect(out).toContain("--font-body:");
  });

  it("produces fluid (clamp) sizes that scale monotonically with preferred px", () => {
    const small = fluidSize(16);
    const large = fluidSize(48);
    expect(small).toMatch(/^clamp\(/);
    expect(large).toMatch(/^clamp\(/);
    // larger preferred -> larger min bound.
    const minSmall = parseFloat(small.slice(6));
    const minLarge = parseFloat(large.slice(6));
    expect(minLarge).toBeGreaterThan(minSmall);
  });

  it("PRESERVES negative letter-spacing (Apple/Linear tight tracking) — not clamped", () => {
    const t = scaleWith(-0.02); // Linear/Apple style
    const report = typographyReport(t);
    expect(report.heading.trackingEm).toBe(-0.02);
    expect(tightTrackingRoles(t)).toContain("heading");
    // The emitted CSS must carry the negative em, not zero.
    const css = emitFluidTypography(t);
    expect(css).toContain("letter-spacing: -0.02em;");
  });

  it("emits fluid typography CSS for heading + body + roles", () => {
    const css = emitFluidTypography(scaleWith());
    expect(css).toContain(".text-heading");
    expect(css).toContain(".text-body");
    expect(css).toContain(".text-label-caps");
    expect(css).toContain("font-size: clamp(");
  });

  it("handles a real brand-like scale (Linear) end to end", async () => {
    const { parseDesignMd } = await import("../parser/design-parser.ts");
    const spec = await parseDesignMd(
      // inline resolve of the on-disk linear spec for determinism
      new URL("../../design-md/linear-dark.md", import.meta.url).pathname,
    );
    const tw = emitTailwindFonts(spec.typography);
    expect(tw).toContain("--font-heading:");
    // Linear uses Inter everywhere; fallback chain must be present.
    expect(tw).toContain("Inter");
  });
});
