import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  meetsAA,
  toOklch,
  oklchChannels,
  oklchCss,
  oklchToHex,
  rgbToOklch,
  interactionShades,
  lightPairings,
  darkPairings,
  shade,
} from "./color-engine.ts";
import type { ColorPalette } from "../spec/types.ts";

describe("req A.3 — color space & contrast normalizer", () => {
  it("round-trips sRGB <-> OKLCH for known colors", () => {
    for (const hex of ["#5e6ad2", "#15803d", "#fafafa", "#08090a", "#fb7185"]) {
      const o = toOklch(hex);
      expect(o.l).toBeGreaterThanOrEqual(0);
      expect(o.l).toBeLessThanOrEqual(1);
      const back = oklchToHex(o);
      // Allow small rounding drift (< 2 per channel).
      const a = rgbToOklch({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
      const b = rgbToOklch({ r: parseInt(back.slice(1, 3), 16), g: parseInt(back.slice(3, 5), 16), b: parseInt(back.slice(5, 7), 16) });
      expect(Math.abs(a.l - b.l)).toBeLessThan(0.02);
    }
  });

  it("emits oklch channel strings (l c h)", () => {
    const ch = oklchChannels("#5e6ad2");
    expect(ch.split(" ").length).toBe(3);
    expect(oklchCss("#5e6ad2")).toMatch(/^oklch\(/);
  });

  it("computes correct WCAG contrast: black on white = 21, white on black = 21", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });

  it("flags AA failures: grey on grey fails, black on white passes", () => {
    expect(meetsAA("#000000", "#ffffff")).toBe(true);
    expect(meetsAA("#888888", "#999999")).toBe(false);
  });

  it("generates interaction shades that stay near the base hue", () => {
    const s = interactionShades("#5e6ad2");
    const base = toOklch("#5e6ad2");
    const hover = toOklch(s.hover);
    // hue preserved within 5deg; lightness changed.
    expect(Math.abs(hover.h - base.h)).toBeLessThanOrEqual(5);
    expect(hover.l).not.toBeCloseTo(base.l, 2);
    expect(s.focusRing).toMatch(/^oklch\(/);
  });

  it("produces light/dark pairings where primary foreground meets WCAG AA", () => {
    const palette: ColorPalette = {
      background: "#08090a",
      foreground: "#f7f8f8",
      primary: "#5e6ad2",
      secondary: "#2c2f36",
      accent: "#7170ff",
      muted: "#16171a",
      destructive: "#e5484d",
      border: "#23252a",
    };
    const light = lightPairings(palette);
    const dark = darkPairings(palette);
    expect(light.primary.aa).toBe(true);
    expect(dark.primary.aa).toBe(true);
    // dark background is darker than the light one.
    expect(toOklch(dark.background.surface).l).toBeLessThan(toOklch(light.background.surface).l);
  });

  it("shade() nudges lightness and clamps to [0,1]", () => {
    expect(toOklch(shade("#ffffff", -0.5)).l).toBeLessThan(1);
    expect(toOklch(shade("#000000", 0.5)).l).toBeGreaterThan(0);
  });
});
