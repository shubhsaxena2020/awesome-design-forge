/**
 * Brand adapters / import shims (roadmap item #5).
 *
 * Upstream design-system variants often ship their tokens in a shape that the
 * canonical DesignSpec doesn't match, so they get "normalized by hand" today.
 * This module makes those normalizations EXPLICIT and TESTED: each adapter maps
 * an upstream variant -> DesignSpec, and the synthesized output stays stable
 * for the same input (covered by tests).
 *
 * `materialToDesignSpec` handles the Material Design 3-ish token shape
 * (primary / primaryContainer / onPrimary / surface / onSurface / error / ...).
 */

import type { DesignSpec, ColorPalette, TypographyScale } from "../spec/types.ts";

export interface MaterialInput {
  id: string;
  name?: string;
  description?: string;
  primary: string;
  primaryContainer?: string;
  onPrimary?: string;
  secondary?: string;
  tertiary?: string;
  surface?: string;
  surfaceVariant?: string;
  onSurface?: string;
  onSurfaceVariant?: string;
  error?: string;
  onError?: string;
  outline?: string;
  /** optional, else a sensible default is inferred */
  headingFont?: string;
  bodyFont?: string;
  radius?: string;
}

function orDefault(v: string | undefined, fallback: string): string {
  return v && v.trim() ? v : fallback;
}

export function materialToDesignSpec(input: MaterialInput): DesignSpec {
  const colors: ColorPalette = {
    background: orDefault(input.surface, "#ffffff"),
    foreground: orDefault(input.onSurface, "#1b1b1f"),
    primary: input.primary,
    onPrimary: orDefault(input.onPrimary, "#ffffff"),
    secondary: orDefault(input.secondary, input.primary),
    onSecondary: "#ffffff",
    accent: orDefault(input.tertiary, input.primary),
    onAccent: "#ffffff",
    muted: orDefault(input.surfaceVariant, "#e7e0ec"),
    onMuted: orDefault(input.onSurfaceVariant, "#49454f"),
    destructive: orDefault(input.error, "#b3261e"),
    onDestructive: orDefault(input.onError, "#ffffff"),
    border: orDefault(input.outline, "#cac4d0"),
    extra: {},
  };

  const headingFont = orDefault(input.headingFont, "Roboto");
  const bodyFont = orDefault(input.bodyFont, "Roboto");
  const typography: TypographyScale = {
    heading: { fontFamily: headingFont, fontStack: [headingFont, "system-ui", "sans-serif"], fontSizePx: 32 },
    body: { fontFamily: bodyFont, fontStack: [bodyFont, "system-ui", "sans-serif"], fontSizePx: 16 },
    baseSizePx: 16,
  };

  return {
    id: input.id,
    name: input.name ?? input.id,
    description: input.description ?? "",
    source: `adapter:material:${input.id}`,
    colors,
    typography,
    elevation: { radius: orDefault(input.radius, "1rem") },
    components: {},
    warnings: [],
  };
}

/**
 * Flat shim: a bare hex palette with no semantic roles. Maps by position so a
 * "flat" upstream export can still produce a canonical spec. Order:
 * [background, foreground, primary, secondary, accent, muted, destructive, border]
 */
export function flatToDesignSpec(id: string, hex: string[]): DesignSpec {
  const get = (i: number, fallback: string) => (hex[i] ?? fallback);
  const colors: ColorPalette = {
    background: get(0, "#ffffff"),
    foreground: get(1, "#101010"),
    primary: get(2, "#2563eb"),
    onPrimary: "#ffffff",
    secondary: get(3, get(2, "#2563eb")),
    onSecondary: "#ffffff",
    accent: get(4, get(2, "#2563eb")),
    onAccent: "#ffffff",
    muted: get(5, "#f3f4f6"),
    onMuted: "#111827",
    destructive: get(6, "#dc2626"),
    onDestructive: "#ffffff",
    border: get(7, "#e5e7eb"),
    extra: {},
  };
  return {
    id,
    name: id,
    description: "",
    source: `adapter:flat:${id}`,
    colors,
    typography: {
      heading: { fontFamily: "Inter", fontStack: ["Inter", "system-ui", "sans-serif"], fontSizePx: 32 },
      body: { fontFamily: "Inter", fontStack: ["Inter", "system-ui", "sans-serif"], fontSizePx: 16 },
      baseSizePx: 16,
    },
    elevation: { radius: "0.5rem" },
    components: {},
    warnings: [],
  };
}
