/**
 * Color space & contrast normalizer (Phase A.3).
 *
 * Turns raw brand colors (hex / rgb / hsl / oklch) into:
 *   - a normalized OKLCH representation,
 *   - CSS custom properties (oklch channel triples) for Tailwind v4 / shadcn,
 *   - accessible hover/focus shades (lightness nudged along the same hue/chroma),
 *   - light/dark contrast pairings (foreground that meets WCAG AA on each surface).
 *
 * Implemented in pure TypeScript with NO external color library, so the project
 * stays 100% offline (guardrail: zero network deps). The OKLCH conversion uses
 * the standard sRGB->linear->LMS->OKLab->OKLCH matrix and its inverse.
 */

import type { ColorPalette, CssColor } from "../spec/types.ts";

export interface Oklch {
  /** Lightness 0..1. */
  l: number;
  /** Chroma 0..~0.37. */
  c: number;
  /** Hue in degrees 0..360. */
  h: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Parse hex / rgb()/rgba() to 0..255 RGB. hsl()/oklch() handled via their own parsers. */
function parseRgb(color: CssColor): Rgb {
  const c = color.trim();
  if (c.startsWith("#") || /^[0-9a-fA-F]{3,8}$/.test(c)) {
    let h = c.replace("#", "");
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    }
  }
  const rgb = c.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(/[ ,/]+/).map(Number);
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  }
  const hsl = c.match(/hsla?\(([^)]+)\)/i);
  if (hsl) return hslToRgb(hsl[1]);
  // oklch() passed through from a spec: convert via oklch->srgb.
  const okl = c.match(/oklch\(([^)]+)\)/i);
  if (okl) return oklchToRgb(parseOklch(okl[1]));
  return { r: 128, g: 128, b: 128 };
}

/** Parse an `hsl(h s% l%)` / `hsl(h, s%, l%)` string to RGB. */
function hslToRgb(inner: string): Rgb {
  const parts = inner.split(/[ ,/]+/).filter(Boolean);
  const h = parseFloat(parts[0] ?? "0");
  const s = (parseFloat(parts[1] ?? "0") / 100) || 0;
  const l = (parseFloat(parts[2] ?? "0") / 100) || 0;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4)),
  };
}

/** Parse an `oklch(l c h)` string (l 0..1, c, h deg). */
export function parseOklch(inner: string): Oklch {
  const parts = inner.split(/[ ,/]+/).filter(Boolean);
  const l = parseFloat(parts[0] ?? "0");
  const c = parseFloat(parts[1] ?? "0");
  // hue may carry 'deg'
  const h = parseFloat(String(parts[2] ?? "0").replace(/deg$/, ""));
  return { l, c, h: Number.isNaN(h) ? 0 : h };
}

// ---- sRGB <-> OKLCH -------------------------------------------------------
function srgbToLinear(u: number): number {
  return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(u: number): number {
  return u <= 0.0031308 ? u * 12.92 : 1.055 * u ** (1 / 2.4) - 0.055;
}

/** sRGB (0..255) -> OKLCH. */
export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l1 = Math.cbrt(l_);
  const m1 = Math.cbrt(m_);
  const s1 = Math.cbrt(s_);
  const L = 0.2104542553 * l1 + 0.793617785 * m1 - 0.0040720468 * s1;
  const A = 1.9779984951 * l1 - 2.428592205 * m1 + 0.4505937099 * s1;
  const Bb = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.808675766 * s1;
  const C = Math.sqrt(A * A + Bb * Bb);
  let H = (Math.atan2(Bb, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: H };
}

/** OKLCH -> sRGB (0..255). */
export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const Bb = c * Math.sin(hr);
  const l1 = l + 0.3963377774 * A + 0.2158037573 * Bb;
  const m1 = l - 0.1055613458 * A - 0.0638541728 * Bb;
  const s1 = l - 0.0894841775 * A - 1.291485548 * Bb;
  const lr = l1 ** 3;
  const lg = m1 ** 3;
  const lb = s1 ** 3;
  const r = linearToSrgb(4.0767416621 * lr - 3.3077115913 * lg + 0.2309699292 * lb);
  const g = linearToSrgb(-1.2684380046 * lr + 2.6097574011 * lg - 0.3413193965 * lb);
  const b = linearToSrgb(-0.0041960863 * lr - 0.7034186147 * lg + 1.707614701 * lb);
  return {
    r: clamp(Math.round(r * 255), 0, 255),
    g: clamp(Math.round(g * 255), 0, 255),
    b: clamp(Math.round(b * 255), 0, 255),
  };
}

/** Convert any CSS color to OKLCH (authoritative entry point). */
export function toOklch(color: CssColor): Oklch {
  return rgbToOklch(parseRgb(color));
}

/** Format an OKLCH triple as the channel string used by CSS vars (l c h). */
export function oklchChannels(color: CssColor): string {
  const { l, c, h } = toOklch(color);
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  return `${r3(l)} ${r3(c)} ${r3(h)}`;
}

/** Emit `oklch(l c h)` CSS value. */
export function oklchCss(color: CssColor): string {
  return `oklch(${oklchChannels(color)})`;
}

/** Convert OKLCH back to a hex string (for non-oklch consumers / debugging). */
export function oklchToHex(color: Oklch): string {
  const { r, g, b } = oklchToRgb(color);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ---- contrast -------------------------------------------------------------
function relLuminance(r: number, g: number, b: number): number {
  const f = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two CSS colors (1..21). */
export function contrastRatio(a: CssColor, b: CssColor): number {
  const la = relLuminance(...Object.values(parseRgb(a)) as [number, number, number]);
  const lb = relLuminance(...Object.values(parseRgb(b)) as [number, number, number]);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA normal-text threshold. */
export const WCAG_AA_NORMAL = 4.5;
/** WCAG AA large-text / UI-component threshold. */
export const WCAG_AA_LARGE = 3;

/** Does `fg` meet WCAG AA (normal text) on `bg`? */
export function meetsAA(fg: CssColor, bg: CssColor, large = false): boolean {
  return contrastRatio(fg, bg) >= (large ? WCAG_AA_LARGE : WCAG_AA_NORMAL);
}

/** Pick the higher-contrast foreground (dark vs light) for a surface. */
export function bestOnSurface(bg: CssColor, light = "#fafafa", dark = "#0a0a0a"): CssColor {
  return contrastRatio(bg, dark) >= contrastRatio(bg, light) ? dark : light;
}

// ---- shade generation -----------------------------------------------------
/**
 * Nudge an OKLCH color's lightness by `delta` (e.g. -0.06 for a hover-darken,
 * +0.08 for a hover-lighten), keeping hue/chroma. Clamped to [0,1].
 */
export function shade(color: CssColor, deltaL: number): CssColor {
  const o = toOklch(color);
  return oklchToHex({ l: clamp(o.l + deltaL, 0, 1), c: o.c, h: o.h });
}

/** Accessible interaction shades for a base color. */
export interface InteractionShades {
  base: CssColor;
  hover: CssColor;
  active: CssColor;
  focusRing: CssColor;
}

/**
 * Generate hover/active/focus shades for a base color. Hover darkens light
 * surfaces and lightens dark ones; active is a stronger nudge; focusRing is a
 * translucent ring using the base OKLCH.
 */
export function interactionShades(base: CssColor): InteractionShades {
  const o = toOklch(base);
  // Darken on light backgrounds, lighten on dark backgrounds.
  const dir = o.l >= 0.5 ? -1 : 1;
  return {
    base,
    hover: shade(base, dir * 0.06),
    active: shade(base, dir * 0.1),
    focusRing: oklchCss(base),
  };
}

/**
 * Build light/dark contrast pairings for a palette: for each surface, compute
 * a foreground that meets WCAG AA. Prefers an explicit `on-*` token when given
 * and it passes; otherwise infers via `bestOnSurface`.
 */
export interface ContrastPairings {
  background: { surface: CssColor; foreground: CssColor; aa: boolean };
  primary: { surface: CssColor; foreground: CssColor; aa: boolean };
  secondary: { surface: CssColor; foreground: CssColor; aa: boolean };
  accent: { surface: CssColor; foreground: CssColor; aa: boolean };
  muted: { surface: CssColor; foreground: CssColor; aa: boolean };
  destructive: { surface: CssColor; foreground: CssColor; aa: boolean };
}

function pair(surface: CssColor, explicitFg: CssColor | undefined): {
  surface: CssColor;
  foreground: CssColor;
  aa: boolean;
} {
  const fg = explicitFg && meetsAA(explicitFg, surface) ? explicitFg : bestOnSurface(surface);
  return { surface, foreground: fg, aa: meetsAA(fg, surface) };
}

/** Produce light-mode pairings for a palette. */
export function lightPairings(p: ColorPalette): ContrastPairings {
  return {
    background: pair(p.background, p.onPrimary ? undefined : undefined),
    primary: pair(p.primary, p.onPrimary),
    secondary: pair(p.secondary, p.onSecondary),
    accent: pair(p.accent, p.onAccent),
    muted: pair(p.muted, p.onMuted),
    destructive: pair(p.destructive, p.onDestructive),
  };
}

/**
 * Produce dark-mode pairings: surfaces are darkened, foregrounds flipped.
 * The brand surface becomes the dark card/popover; background is mixed toward
 * black for depth (mirrors css-variables.ts strategy, but contrast-checked).
 */
export function darkPairings(p: ColorPalette): ContrastPairings {
  const darkBg = shade(p.background, -0.45);
  const fg = bestOnSurface(darkBg);
  const flip = (surface: CssColor, explicit?: CssColor) =>
    pair(surface, explicit ?? undefined);
  return {
    background: { surface: darkBg, foreground: fg, aa: meetsAA(fg, darkBg) },
    primary: flip(p.primary, p.onPrimary),
    secondary: flip(p.secondary, p.onSecondary),
    accent: flip(p.accent, p.onAccent),
    muted: flip(p.muted, p.onMuted),
    destructive: flip(p.destructive, p.onDestructive),
  };
}
