/**
 * Strict, canonical token interfaces for the design-forge pipeline.
 *
 * These types are the single source of truth produced by
 * `src/parser/design-parser.ts` (parseDesignMd -> DesignSpec) and consumed by
 * the transformers (`color-engine`, `typography-engine`) and generators.
 *
 * They intentionally separate *raw designer intent* (ColorPalette,
 * TypographyScale, ElevationTokens, ComponentSpecs) from the *normalized*
 * DesignSpec that downstream code receives, so each stage has a tight contract.
 *
 * All color values are stored as CSS strings (hex / rgb() / hsl() / oklch()).
 * The color engine is responsible for normalizing them; these types stay
 * permissive about input format (brands vary wildly) but strict about shape.
 */

/** A single CSS color. We accept any valid CSS color string from a spec. */
export type CssColor = string;

/** Raw color palette as authored in DESIGN.md front matter. */
export interface ColorPalette {
  /** Page background / surface fill. */
  background: CssColor;
  /** High-emphasis text / core foreground. */
  foreground: CssColor;
  /** Interaction / action color (shadcn --primary). */
  primary: CssColor;
  /** Secondary surface / accent fill. */
  secondary: CssColor;
  /** Tertiary accent (often a brighter highlight). */
  accent: CssColor;
  /** Muted / low-emphasis surface. */
  muted: CssColor;
  /** Destructive / error color. */
  destructive: CssColor;
  /** Border / divider color. */
  border: CssColor;
  /**
   * Optional explicit "on-*" foregrounds. When present they override the
   * contrast-inferred foreground for that surface (see color-engine).
   */
  onPrimary?: CssColor;
  onSecondary?: CssColor;
  onAccent?: CssColor;
  onMuted?: CssColor;
  onDestructive?: CssColor;
  /** Any extra named colors the spec declared (kept for reference). */
  extra?: Record<string, CssColor>;
}

/** One typographic role (a font family + sizing + tracking + leading). */
export interface TypeRole {
  /** Primary font family. */
  fontFamily: string;
  /** Optional fallback chain (e.g. ["Inter", "system-ui", "sans-serif"]). */
  fontStack: string[];
  /** Font size in px (already resolved from rem/px/unitless). */
  fontSizePx: number;
  /** Optional font weight (e.g. 600). */
  fontWeight?: number;
  /** Line height as a unitless multiplier (e.g. 1.5). */
  lineHeight?: number;
  /** Letter spacing in em (e.g. -0.02 for tight tracking, 0.06 for caps). */
  letterSpacingEm?: number;
}

/** Raw typography scale as authored in DESIGN.md. */
export interface TypographyScale {
  /** Display / largest heading role. */
  heading: TypeRole;
  /** Body / base text role. */
  body: TypeRole;
  /** Optional additional named roles (h1..h6, label-caps, etc.). */
  roles?: Record<string, TypeRole>;
  /** Base font size in px used as the fluid-type root. */
  baseSizePx: number;
}

/** Border-radius scale (rem strings) as authored. */
export interface ElevationTokens {
  /** Default corner radius (shadcn --radius). */
  radius: string;
  /** Optional additional radii (sm/md/lg/full...). */
  radii?: Record<string, string>;
  /** Optional shadow/elevation tokens (kept as authored strings). */
  shadows?: Record<string, string>;
}

/** A single component token block extracted from the spec's `components:` map. */
export interface ComponentSpec {
  /** Source token map (verbatim, with {refs} already resolved). */
  tokens: Record<string, string>;
}

/**
 * The fully-parsed, canonical design specification.
 *
 * This is the object `parseDesignMd(filePath)` resolves to. It is strict:
 * every field is present (with documented fallbacks applied during parsing),
 * so transformers and generators never have to null-check.
 */
export interface DesignSpec {
  /** Stable slug id (e.g. "linear-dark"). */
  id: string;
  /** Human brand name. */
  name: string;
  /** Short description. */
  description: string;
  /** Source file path the spec was parsed from (for traceability). */
  source: string;
  /** Original DESIGN.md spec version, if declared. */
  version?: string;
  /** Normalized color palette. */
  colors: ColorPalette;
  /** Normalized typography scale. */
  typography: TypographyScale;
  /** Elevation / radius tokens. */
  elevation: ElevationTokens;
  /** Component token blocks (button-primary, card, ...). */
  components: Record<string, ComponentSpec>;
  /** Non-fatal parse notes (missing keys, inferred values, etc.). */
  warnings: string[];
}
