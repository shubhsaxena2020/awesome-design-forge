import type { BrandTokens } from "../brands/tokens.ts";

/**
 * shadcn/Tailwind v4 theme emitter.
 *
 * Maps brand tokens to the standard shadcn CSS custom properties expected by
 * shadcn component styles (Button, Card, Input, Dialog, ...):
 *   --background --foreground --card --card-foreground --popover
 *   --popover-foreground --primary --primary-foreground --secondary
 *   --secondary-foreground --muted --muted-foreground --accent
 *   --accent-foreground --destructive --destructive-foreground --border
 *   --input --ring --radius
 *
 * Light mode lives on :root; a `.dark` block flips surface/foreground pairs so
 * dark mode is explicit (shadcn expects the dark palette under `.dark`, not via
 * `prefers-color-scheme` alone — the preview toggles the `.dark` class).
 *
 * All colors are emitted as oklch() so they compose cleanly with Tailwind v4
 * and shadcn's `hsl(var(--x))` -> `oklch(var(--x))` convention. We store the
 * channel triple (L C H) and components reference them as `oklch(var(--x))`.
 */

const toOklch = (hex: string): string => {
  const { r, g, b } = hexToRgb(hex);
  const [l, c, h] = srgbToOklch(r / 255, g / 255, b / 255);
  return `${round(l)} ${round(c)} ${round(h)}`;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h,
    16,
  );
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// sRGB (0..1) -> OKLCH, simplified linearization + matrix; good enough for themes.
function srgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const lin = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  const lr = lin(r), lg = lin(g), lb = lin(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Relative luminance (0..1) to decide foreground-on-surface contrast. */
const luminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const onSurface = (bg: string): string =>
  luminance(bg) > 0.5 ? "#0a0a0a" : "#fafafa";

const withAlpha = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
};

export function emitLightVars(b: BrandTokens): string {
  const fgOnPrimary = onSurface(b.colors.primary);
  const fgOnAccent = onSurface(b.colors.accent);
  const fgOnSecondary = onSurface(b.colors.secondary);
  return [
    `--background: ${toOklch(b.colors.background)};`,
    `--foreground: ${toOklch(b.colors.foreground)};`,
    `--card: ${toOklch(b.colors.background)};`,
    `--card-foreground: ${toOklch(b.colors.foreground)};`,
    `--popover: ${toOklch(b.colors.background)};`,
    `--popover-foreground: ${toOklch(b.colors.foreground)};`,
    `--primary: ${toOklch(b.colors.primary)};`,
    `--primary-foreground: ${toOklch(fgOnPrimary)};`,
    `--secondary: ${toOklch(b.colors.secondary)};`,
    `--secondary-foreground: ${toOklch(fgOnSecondary)};`,
    `--muted: ${toOklch(b.colors.muted)};`,
    `--muted-foreground: ${toOklch(withAlpha(b.colors.foreground, 0.62))};`,
    `--accent: ${toOklch(b.colors.accent)};`,
    `--accent-foreground: ${toOklch(fgOnAccent)};`,
    `--destructive: ${toOklch(b.colors.destructive)};`,
    `--destructive-foreground: ${toOklch(onSurface(b.colors.destructive))};`,
    `--border: ${toOklch(b.colors.border)};`,
    `--input: ${toOklch(b.colors.border)};`,
    `--ring: ${toOklch(b.colors.primary)};`,
    `--radius: ${b.radius};`,
  ].join("\n    ");
}

export function emitDarkVars(b: BrandTokens): string {
  // Dark mode keeps brand hues but darkens the surface stack and flips
  // foregrounds. We reuse the brand surface as the *card/popover* layer and
  // synthesize a deeper background by mixing background with black.
  const darkBg = mix(b.colors.background, "#000000", 0.45);
  const fgOnPrimary = onSurface(b.colors.primary);
  const fgOnAccent = onSurface(b.colors.accent);
  const fgOnSecondary = onSurface(b.colors.secondary);
  return [
    `--background: ${toOklch(darkBg)};`,
    `--foreground: ${toOklch(b.colors.foreground)};`,
    `--card: ${toOklch(b.colors.background)};`,
    `--card-foreground: ${toOklch(b.colors.foreground)};`,
    `--popover: ${toOklch(b.colors.background)};`,
    `--popover-foreground: ${toOklch(b.colors.foreground)};`,
    `--primary: ${toOklch(b.colors.primary)};`,
    `--primary-foreground: ${toOklch(fgOnPrimary)};`,
    `--secondary: ${toOklch(b.colors.secondary)};`,
    `--secondary-foreground: ${toOklch(fgOnSecondary)};`,
    `--muted: ${toOklch(b.colors.muted)};`,
    `--muted-foreground: ${toOklch(withAlpha(b.colors.foreground, 0.6))};`,
    `--accent: ${toOklch(b.colors.accent)};`,
    `--accent-foreground: ${toOklch(fgOnAccent)};`,
    `--destructive: ${toOklch(b.colors.destructive)};`,
    `--destructive-foreground: ${toOklch(onSurface(b.colors.destructive))};`,
    `--border: ${toOklch(b.colors.border)};`,
    `--input: ${toOklch(b.colors.border)};`,
    `--ring: ${toOklch(b.colors.primary)};`,
    `--radius: ${b.radius};`,
  ].join("\n  ");
}

function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

/** Full theme.css: :root light + .dark override + font + base layer. */
export function emitThemeCss(b: BrandTokens): string {
  return `/* auto-generated by design-forge — brand: ${b.id} (${b.name}) */
@layer base {
  :root {
    ${emitLightVars(b)}
    --font-heading: ${b.typography.heading}, ui-sans-serif, system-ui, sans-serif;
    --font-body: ${b.typography.body}, ui-sans-serif, system-ui, sans-serif;
    --base-size: ${b.typography.baseSize}px;
  }
  .dark {
    ${emitDarkVars(b)}
  }
  * {
    border-color: oklch(var(--border));
  }
  body {
    background-color: oklch(var(--background));
    color: oklch(var(--foreground));
    font-family: var(--font-body);
    font-size: var(--base-size);
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
  }
}

/* Standard shadcn component contract: components reference these vars so the
   generated theme.css compiles against shadcn's default styles. */
@layer components {
  .df-surface {
    background-color: oklch(var(--background));
    color: oklch(var(--foreground));
    border-color: oklch(var(--border));
    border-radius: var(--radius);
  }
  .df-primary {
    background-color: oklch(var(--primary));
    color: oklch(var(--primary-foreground));
  }
}
`;
}

/** Tailwind v4 @theme block that exposes the vars to utilities (bg-background, etc.). */
export function emitTailwindTheme(b: BrandTokens): string {
  return `@import "tailwindcss";

@theme inline {
  --color-background: oklch(var(--background));
  --color-foreground: oklch(var(--foreground));
  --color-card: oklch(var(--card));
  --color-card-foreground: oklch(var(--card-foreground));
  --color-popover: oklch(var(--popover));
  --color-popover-foreground: oklch(var(--popover-foreground));
  --color-primary: oklch(var(--primary));
  --color-primary-foreground: oklch(var(--primary-foreground));
  --color-secondary: oklch(var(--secondary));
  --color-secondary-foreground: oklch(var(--secondary-foreground));
  --color-muted: oklch(var(--muted));
  --color-muted-foreground: oklch(var(--muted-foreground));
  --color-accent: oklch(var(--accent));
  --color-accent-foreground: oklch(var(--accent-foreground));
  --color-destructive: oklch(var(--destructive));
  --color-destructive-foreground: oklch(var(--destructive-foreground));
  --color-border: oklch(var(--border));
  --color-input: oklch(var(--input));
  --color-ring: oklch(var(--ring));
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
  --font-heading: ${b.typography.heading}, ui-sans-serif, system-ui, sans-serif;
  --font-body: ${b.typography.body}, ui-sans-serif, system-ui, sans-serif;
}

@import "./theme.css";
`;
}
