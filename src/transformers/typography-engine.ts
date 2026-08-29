/**
 * Typography & spacing scale generator (Phase A.4).
 *
 * Converts a brand's typography tokens (font families, tracking, line-heights,
 * sizes) into:
 *   - Tailwind v4 `@theme` font-family declarations (with fallback chains),
 *   - fluid typography rules (clamp()-based) so headings scale smoothly across
 *     viewport widths without layout thrash,
 *   - a normalized spacing/radius scale.
 *
 * Pure TypeScript, no deps (offline guardrail). Negative letter-spacing
 * (e.g. Apple/Linear tight tracking like -0.02em) is preserved exactly.
 */

import type { TypographyScale, TypeRole } from "../spec/types.ts";

/** Format a font stack as a CSS font-family value. */
export function fontFamilyCss(stack: string[]): string {
  return stack.map((f) => (/\s/.test(f) && !f.startsWith('"') && !f.startsWith("'") ? `"${f}"` : f)).join(", ");
}

/** Tailwind v4 `@theme` font declarations for a scale. */
export function emitTailwindFonts(t: TypographyScale): string {
  const lines: string[] = [];
  lines.push(`  --font-heading: ${fontFamilyCss(t.heading.fontStack)};`);
  lines.push(`  --font-body: ${fontFamilyCss(t.body.fontStack)};`);
  if (t.roles) {
    for (const [name, role] of Object.entries(t.roles)) {
      const key = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      lines.push(`  --font-${key}: ${fontFamilyCss(role.fontStack)};`);
    }
  }
  return lines.join("\n");
}

/**
 * Fluid size via clamp(): scales between a min (small viewport) and max (large
 * viewport) using the preferred px size as the 100%-width anchor. Keeps type
 * responsive without media queries.
 *
 * @param px preferred size in px
 * @param minVw preferred min viewport (default 360)
 * @param maxVw preferred max viewport (default 1280)
 */
export function fluidSize(px: number, minVw = 360, maxVw = 1280): string {
  const min = px * 0.82; // floor at 82% on small screens
  const max = px * 1.12; // ceiling at 112% on large screens
  // clamps relative to viewport using the standard fluid formula.
  const slope = (max - min) / (maxVw - minVw);
  const intercept = min - slope * minVw;
  const preferred = `calc(${intercept.toFixed(3)}px + ${(slope * 100).toFixed(3)}vw)`;
  return `clamp(${min.toFixed(2)}px, ${preferred}, ${max.toFixed(2)}px)`;
}

/** Emit a CSS rule for one role: font-size (fluid) + line-height + tracking. */
export function emitRoleCss(name: string, role: TypeRole): string {
  const ls =
    role.letterSpacingEm != null ? `  letter-spacing: ${role.letterSpacingEm}em;\n` : "";
  const lh = role.lineHeight != null ? `  line-height: ${role.lineHeight};\n` : "";
  const w = role.fontWeight != null ? `  font-weight: ${role.fontWeight};\n` : "";
  return `.text-${name} {\n  font-family: var(--font-${name === "heading" ? "heading" : name === "body" ? "body" : name});\n  font-size: ${fluidSize(role.fontSizePx)};\n${lh}${ls}${w}}`;
}

/** Emit fluid typography CSS for the whole scale (heading + body + roles). */
export function emitFluidTypography(t: TypographyScale): string {
  const blocks: string[] = [];
  blocks.push(emitRoleCss("heading", t.heading));
  blocks.push(emitRoleCss("body", t.body));
  if (t.roles) {
    for (const [name, role] of Object.entries(t.roles)) {
      blocks.push(emitRoleCss(name.replace(/[^a-z0-9]+/gi, "-").toLowerCase(), role));
    }
  }
  return blocks.join("\n\n");
}

/**
 * Validate tracking values: negative tracking is allowed (Apple/Linear style)
 * and should be preserved, not clamped to zero. Returns a note if a role uses
 * tight (negative) tracking so callers can assert it survives the pipeline.
 */
export function tightTrackingRoles(t: TypographyScale): string[] {
  const out: string[] = [];
  const check = (n: string, r: TypeRole) => {
    if (r.letterSpacingEm != null && r.letterSpacingEm < 0) out.push(n);
  };
  check("heading", t.heading);
  check("body", t.body);
  if (t.roles) for (const [n, r] of Object.entries(t.roles)) check(n, r);
  return out;
}

/** Spacing scale rooted at the base font size (4px-ish rhythm derived from rem). */
export function spacingScale(basePx = 16, steps = 8): string[] {
  // 0.25rem steps: 0.25,0.5,0.75,1,1.5,2,3,4 (Tailwind-like).
  const mults = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
  return mults.slice(0, steps).map((m) => `${(m * basePx).toFixed(m < 1 ? 2 : 0)}px`);
}

/** A normalized typography descriptor for downstream generators/inspect. */
export interface TypographyReport {
  heading: { family: string; sizePx: number; trackingEm: number | null; fluid: string };
  body: { family: string; sizePx: number; trackingEm: number | null; fluid: string };
  tightTracking: string[];
}

/** Summarize a scale for the CLI `inspect` command / tests. */
export function typographyReport(t: TypographyScale): TypographyReport {
  return {
    heading: {
      family: t.heading.fontFamily,
      sizePx: t.heading.fontSizePx,
      trackingEm: t.heading.letterSpacingEm ?? null,
      fluid: fluidSize(t.heading.fontSizePx),
    },
    body: {
      family: t.body.fontFamily,
      sizePx: t.body.fontSizePx,
      trackingEm: t.body.letterSpacingEm ?? null,
      fluid: fluidSize(t.body.fontSizePx),
    },
    tightTracking: tightTrackingRoles(t),
  };
}
