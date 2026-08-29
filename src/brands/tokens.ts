// Core token model shared by all generators, the preview showroom, and the CLI.

export interface BrandTokens {
  id: string;
  name: string;
  /** Short human description used in inspect / preview. */
  description: string;
  colors: {
    /** Raw hex values (designer intent); generators derive shades. */
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
    destructive: string;
    border: string;
  };
  /** Radius in rem (shadcn --radius). */
  radius: string;
  typography: {
    /** Font family for headings. */
    heading: string;
    /** Font family for body. */
    body: string;
    /** Base font size in px. */
    baseSize: number;
  };
}

// 5 reference brands used by the preview showroom + visual regression suite.
export const BRANDS: BrandTokens[] = [
  {
    id: "aurora",
    name: "Aurora",
    description: "Cool Nordic SaaS — deep indigo + electric cyan, soft 0.75rem radius.",
    colors: {
      background: "#0b1020",
      foreground: "#e8ecf6",
      primary: "#22d3ee",
      secondary: "#6366f1",
      accent: "#a855f7",
      muted: "#1b2438",
      destructive: "#f43f5e",
      border: "#283149",
    },
    radius: "0.75rem",
    typography: { heading: "Space Grotesk", body: "Inter", baseSize: 16 },
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm fintech — charcoal + amber ember, crisp 0.5rem radius.",
    colors: {
      background: "#15110d",
      foreground: "#f7ede2",
      primary: "#f59e0b",
      secondary: "#b45309",
      accent: "#ef4444",
      muted: "#241c14",
      destructive: "#dc2626",
      border: "#3a2e20",
    },
    radius: "0.5rem",
    typography: { heading: "Sora", body: "Inter", baseSize: 15 },
  },
  {
    id: "verdant",
    name: "Verdant",
    description: "Eco / health — off-white + forest green, rounded 1rem radius.",
    colors: {
      background: "#f6f8f3",
      foreground: "#14241a",
      primary: "#15803d",
      secondary: "#4d7c0f",
      accent: "#0d9488",
      muted: "#e3ebdc",
      destructive: "#b91c1c",
      border: "#cdd9c2",
    },
    radius: "1rem",
    typography: { heading: "Fraunces", body: "DM Sans", baseSize: 16 },
  },
  {
    id: "mono",
    name: "Mono",
    description: "Developer tools — near-black + lime on neutral grays, sharp 0.25rem radius.",
    colors: {
      background: "#0a0a0a",
      foreground: "#ededed",
      primary: "#a3e635",
      secondary: "#525252",
      accent: "#38bdf8",
      muted: "#171717",
      destructive: "#ef4444",
      border: "#2a2a2a",
    },
    radius: "0.25rem",
    typography: { heading: "JetBrains Mono", body: "IBM Plex Sans", baseSize: 14 },
  },
  {
    id: "coral",
    name: "Coral",
    description: "Playful consumer — coral + sky, friendly 0.9rem radius.",
    colors: {
      background: "#fff5f3",
      foreground: "#3a1d18",
      primary: "#fb7185",
      secondary: "#7dd3fc",
      accent: "#fbbf24",
      muted: "#ffe4e0",
      destructive: "#e11d48",
      border: "#ffd0c7",
    },
    radius: "0.9rem",
    typography: { heading: "Outfit", body: "Nunito", baseSize: 16 },
  },
  {
    id: "linear",
    name: "Linear",
    description: "Productivity SaaS — near-black canvas, signature indigo, crisp 0.375rem radius.",
    colors: {
      background: "#08090a",
      foreground: "#f7f8f8",
      primary: "#5e6ad2",
      secondary: "#2c2f36",
      accent: "#7170ff",
      muted: "#16171a",
      destructive: "#e5484d",
      border: "#23252a",
    },
    radius: "0.375rem",
    typography: { heading: "Inter", body: "Inter", baseSize: 15 },
  },
];

/**
 * Built-in demo brands + everything ingested from DESIGN.md specs.
 *
 * Ingested brands are baked into `ingested.json` by `scripts/gen-brands.ts`
 * (a Node codegen step) so the browser preview can consume them without
 * `node:fs`. `loadAllBrands()` is therefore fs-free and safe in both Node
 * and the browser. Use it everywhere instead of the raw `BRANDS` constant.
 */
import { INGESTED } from "./ingested.ts";

export function loadAllBrands(): { brands: BrandTokens[]; ingested: number; warnings: string[] } {
  const merged = new Map<string, BrandTokens>();
  for (const b of BRANDS) merged.set(b.id, b);
  const ingestedBrands = INGESTED;
  for (const b of ingestedBrands) merged.set(b.id, b);
  return { brands: [...merged.values()], ingested: ingestedBrands.length, warnings: [] };
}

export function getBrand(id: string): BrandTokens {
  const b = BRANDS.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown brand: ${id} (known: ${BRANDS.map((x) => x.id).join(", ")})`);
  return b;
}
