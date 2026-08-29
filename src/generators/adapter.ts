/**
 * Adapter: DesignSpec (Phase A canonical model) -> BrandTokens (legacy model).
 *
 * The existing shadcn/css-variables emitter was built around `BrandTokens`.
 * Rather than duplicate that logic, we bridge the new `DesignSpec` into the
 * legacy shape so a single emitter serves both the built-in demo brands and
 * any brand parsed from DESIGN.md. One source of truth, no divergence.
 */

import type { BrandTokens } from "../brands/tokens.ts";
import type { DesignSpec } from "../spec/types.ts";
import { bestOnSurface } from "../transformers/color-engine.ts";

/** Convert a parsed DesignSpec into a BrandTokens equivalent. */
export function specToBrandTokens(spec: DesignSpec): BrandTokens {
  const c = spec.colors;
  const fgOnPrimary = c.onPrimary ?? bestOnSurface(c.primary);
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    colors: {
      background: c.background,
      foreground: c.foreground,
      primary: c.primary,
      secondary: c.secondary,
      accent: c.accent,
      muted: c.muted,
      destructive: c.destructive,
      border: c.border,
    },
    radius: spec.elevation.radius,
    typography: {
      heading: spec.typography.heading.fontFamily,
      body: spec.typography.body.fontFamily,
      baseSize: spec.typography.baseSizePx,
    },
    // carry the contrast-inferred foregrounds for shadcn emitters if needed
    ...({ onPrimary: fgOnPrimary } as object),
  } as BrandTokens;
}
