import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import type { BrandTokens } from "./tokens.ts";
import { parseDesignMdCached, clearSpecCache } from "../parser/cache.ts";
import { specToBrandTokens } from "../generators/adapter.ts";
import type { DesignSpec } from "../spec/types.ts";

/**
 * Deterministic ingester for Google DESIGN.md brand specs.
 *
 * Reads every `*.md` file in a directory (recursively), parses the YAML
 * front matter, resolves `{token.path}` references, and maps the documented
 * design-md token shape onto our internal BrandTokens so the rest of the
 * pipeline (theme emitter, component factory, preview, CLI) works unchanged.
 *
 * The mapping is defensive: real-world specs vary (oklch/rgb/hex colors,
 * `primary/secondary/tertiary/neutral`, `on-*` foregrounds, missing fields),
 * so every color falls back gracefully and foregrounds are inferred from
 * WCAG contrast when an explicit `on-*` token is absent.
 */

export interface IngestResult {
  brands: BrandTokens[];
  files: number;
  warnings: string[];
}

interface DesignMd {
  name?: string;
  description?: string;
  colors?: Record<string, string>;
  typography?: Record<string, Record<string, string | number>>;
  rounded?: Record<string, string | number>;
  spacing?: Record<string, string | number>;
  components?: Record<string, Record<string, string>>;
  [k: string]: unknown;
}

const refRe = /\{([^}]+)\}/g;

/** Resolve a `{a.b.c}` reference against the parsed token tree. */
function resolveRef(raw: string, root: unknown): string {
  let out = raw;
  out = out.replace(refRe, (_m, p: string) => {
    const parts = p.split(".");
    let cur: unknown = root;
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        return "";
      }
    }
    return typeof cur === "string" ? cur : String(cur ?? "");
  });
  return out;
}

/** Pick the first defined color from a list of candidate keys. */
function pick(colors: Record<string, string>, keys: string[], fallback: string): string {
  for (const k of keys) {
    if (colors[k]) return colors[k];
  }
  return fallback;
}

/** Parse a CSS color to rgb; supports hex, rgb()/rgba(), oklch()/hsl() -> best-effort. */
function toRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.trim();
  if (c.startsWith("#") || /^[0-9a-fA-F]{3,8}$/.test(c)) {
    let h = c.replace("#", "");
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    if (h.length === 6) {
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
    if (h.length === 8) {
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
  }
  const rgb = c.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const [r, g, b] = rgb[1].split(/[ ,/]+/).map(Number);
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  }
  // oklch / hsl: we can't cheaply convert; assume mid grey so contrast math doesn't crash.
  return { r: 128, g: 128, b: 128 };
}

const relLuminance = (hex: string): number => {
  const { r, g, b } = toRgb(hex);
  const f = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a: string, b: string): number => {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

/** foreground that meets WCAG AA (>=4.5:1) against `bg`. */
const onSurface = (bg: string, light = "#fafafa", dark = "#0a0a0a"): string =>
  contrast(bg, dark) >= contrast(bg, light) ? dark : light;

/** Mix two hex colors (best-effort for hex only). */
function mix(a: string, b: string, t: number): string {
  const ca = toRgb(a), cb = toRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

/** Convert any dimension to a rem string (px/16; rem passthrough; else raw). */
function toRem(v: string | number): string {
  const s = String(v).trim();
  if (s.endsWith("rem") || s.endsWith("em")) return s;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return "0.5rem";
  if (s.endsWith("px")) return `${n / 16}rem`;
  // unitless -> treat as px
  return `${n / 16}rem`;
}

function dimPx(v: string | number): number {
  const s = String(v).trim();
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 16;
  if (s.endsWith("rem") || s.endsWith("em")) return n * 16;
  return n; // assume px
}

function mapOne(spec: DesignMd, rawColors: Record<string, string>, warnings: string[]): BrandTokens {
  const id = (spec.name ?? "brand")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "brand";

  const colors = rawColors;

  // Canonical DESIGN.md semantics (see design-md starter.md):
  //   primary   = core text / high-emphasis text (-> shadcn --foreground)
  //   tertiary  = interaction driver / action color (-> shadcn --primary)
  //   neutral   = page background / surface fill
  //   on-*      = foreground-on-* (e.g. on-neutral = readable text on neutral)
  // We map onto shadcn's token set with graceful fallbacks so that specs
  // which omit some keys still produce a valid, readable theme.
  const background = pick(colors, ["background", "surface", "canvas", "neutral"], "#ffffff");
  const foreground = pick(
    colors,
    ["on-background", "on-surface", "on-canvas", "on-neutral", "text", "foreground"],
    onSurface(background),
  );
  const primary = pick(colors, ["tertiary", "accent", "action", "secondary", "primary"], "#2563eb");
  const secondary = pick(colors, ["secondary", "primary"], mix(background, primary, 0.5));
  const accent = pick(colors, ["tertiary", "accent", "secondary"], primary);
  const muted = pick(colors, ["muted", "neutral-200", "surface-200"], mix(background, foreground, 0.06));
  const destructive = pick(colors, ["error", "danger", "destructive"], "#ef4444");
  const border = pick(colors, ["border", "divider"], mix(background, foreground, 0.12));

  // Typography: choose heading = largest heading token; body = body-md/body.
  const typo = spec.typography ?? {};
  const headingKeys = Object.keys(typo).filter((k) => /^(h\d|display|title|heading)/i.test(k));
  let headingKey = headingKeys.sort(
    (a, b) => dimPx(typo[b]?.fontSize ?? 0) - dimPx(typo[a]?.fontSize ?? 0),
  )[0];
  if (!headingKey) headingKey = Object.keys(typo)[0];
  const bodyKey = Object.keys(typo).find((k) => /^(body|text|paragraph|base)/i.test(k)) ?? headingKey;

  const headingFont = (headingKey && typo[headingKey]?.fontFamily) || "Inter";
  const bodyFont = (bodyKey && typo[bodyKey]?.fontFamily) || headingFont || "Inter";
  const bodySize = bodyKey ? dimPx(typo[bodyKey]?.fontSize ?? 16) : 16;

  // Radius: prefer md/lg/base, else the largest.
  const rounded = spec.rounded ?? {};
  const radKey = ["md", "lg", "base", "sm", "xl"].find((k) => rounded[k] != null) ?? Object.keys(rounded)[0];
  const radius = radKey != null ? toRem(rounded[radKey] as string) : "0.5rem";

  if (!spec.name) warnings.push(`spec missing 'name' (using id '${id}')`);
  if (!colors.primary) warnings.push(`${id}: no 'primary' color, using default`);

  return {
    id,
    name: spec.name ?? id,
    description: spec.description ?? "",
    colors: {
      background,
      foreground,
      primary,
      secondary,
      accent,
      muted,
      destructive,
      border,
    },
    radius,
    typography: {
      heading: String(headingFont),
      body: String(bodyFont),
      baseSize: bodySize,
    },
  };
}

/** Parse a single DESIGN.md file (front matter only; prose is ignored). */
export function parseDesignMd(content: string, warnings: string[]): BrandTokens | null {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    warnings.push("file has no YAML front matter; skipped");
    return null;
  }
  let doc: DesignMd;
  try {
    doc = (yaml.load(m[1]) as DesignMd) ?? {};
  } catch (e) {
    warnings.push(`YAML parse error: ${(e as Error).message}`);
    return null;
  }
  if (!doc.colors && !doc.typography) {
    warnings.push("file has no colors/typography tokens; skipped");
    return null;
  }
  // Resolve {token} references throughout the color block first.
  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(doc.colors ?? {})) {
    resolved[k] = resolveRef(String(v), doc);
  }
  return mapOne(doc, resolved, warnings);
}

/** Ingest every `*.md` in `dir` (recursive) into BrandTokens. */
export function ingestDir(dir: string): IngestResult {
  const warnings: string[] = [];
  if (!fs.existsSync(dir)) {
    return { brands: [], files: 0, warnings: [`directory not found: ${dir}`] };
  }
  const files: string[] = [];
  const walk = (p: string) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const fp = path.join(p, e.name);
      if (e.isDirectory()) walk(fp);
      else if (e.name.toLowerCase().endsWith(".md")) files.push(fp);
    }
  };
  walk(dir);

  const brands: BrandTokens[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    const content = fs.readFileSync(f, "utf8");
    const before = warnings.length;
    const brand = parseDesignMd(content, warnings);
    if (brand) {
      // de-dupe ids
      let bid = brand.id;
      let n = 1;
      while (seen.has(bid)) bid = `${brand.id}-${++n}`;
      brand.id = bid;
      seen.add(bid);
      brands.push(brand);
    }
    if (warnings.length === before && !brand) warnings.push(`${f}: no brand produced`);
  }
  return { brands, files: files.length, warnings };
}

/**
 * Ingest every `*.md` in `dir` (recursive) into BrandTokens by bridging each
 * Phase A DesignSpec via specToBrandTokens. Canonical path shared with the CLI
 * export/inspect commands.
 */
export async function ingestDirSpecs(dir: string): Promise<IngestResult> {
  const warnings: string[] = [];
  if (!fs.existsSync(dir)) {
    return { brands: [], files: 0, warnings: [`directory not found: ${dir}`] };
  }
  const files: string[] = [];
  const walk = (p: string) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const fp = path.join(p, e.name);
      if (e.isDirectory()) walk(fp);
      else if (e.name.toLowerCase().endsWith(".md")) files.push(fp);
    }
  };
  walk(dir);

  const brands: BrandTokens[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    try {
      const spec = await parseDesignMdCached(f);
      let bid = spec.id;
      let n = 1;
      while (seen.has(bid)) bid = `${spec.id}-${++n}`;
      spec.id = bid;
      seen.add(bid);
      brands.push(specToBrandTokens(spec));
    } catch (e) {
      warnings.push(`${f}: ${(e as Error).message}`);
    }
  }
  return { brands, files: files.length, warnings };
}

/**
 * Ingest every `*.md` in `dir` (recursive) into DesignSpec[] (no bridge).
 * Used to bake the full spec registry so baked brands are synthesizable
 * per-spec (fonts, tracking, elevation) — not just via BrandTokens.
 */
export async function ingestDirDesignSpecs(dir: string): Promise<{ specs: DesignSpec[]; files: number; warnings: string[] }> {
  const warnings: string[] = [];
  if (!fs.existsSync(dir)) {
    return { specs: [], files: 0, warnings: [`directory not found: ${dir}`] };
  }
  const files: string[] = [];
  const walk = (p: string) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const fp = path.join(p, e.name);
      if (e.isDirectory()) walk(fp);
      else if (e.name.toLowerCase().endsWith(".md")) files.push(fp);
    }
  };
  walk(dir);

  const specs: DesignSpec[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    try {
      const spec = await parseDesignMdCached(f);
      let bid = spec.id;
      let n = 1;
      while (seen.has(bid)) bid = `${spec.id}-${++n}`;
      spec.id = bid;
      seen.add(bid);
      specs.push(spec);
    } catch (e) {
      warnings.push(`${f}: ${(e as Error).message}`);
    }
  }
  return { specs, files: files.length, warnings };
}

/**
 * Bake the full DesignSpec[] registry (browser-safe artifact) alongside the
 * BrandTokens bake, so the preview/CLI can synthesize components per-spec.
 */
export async function ingestAndWriteSpecs(specDir: string, outFile: string): Promise<{ specs: DesignSpec[]; files: number; warnings: string[] }> {
  clearSpecCache();
  const res = await ingestDirDesignSpecs(specDir);
  const banner =
    "// AUTO-GENERATED by scripts/gen-brands.ts — do not edit by hand.\n" +
    "// Regenerate after changing design-md/ specs: pnpm gen:brands\n" +
    'import type { DesignSpec } from "../spec/types.ts";\n\n' +
    "export const INGESTED_SPECS: DesignSpec[] = ";
  // DesignSpec is JSON-serializable (all string/number/record fields).
  fs.writeFileSync(outFile, banner + JSON.stringify(res.specs, null, 2) + ";\n");
  return res;
}

/**
 * Ingest a DESIGN.md directory and (re)bake the browser-safe
 * `src/brands/ingested.ts` artifact so the Vite preview can consume
 * ingested brands without `node:fs`. Returns the ingest result.
 *
 * Uses the canonical Phase A parse (ingestDirSpecs) so the baked brands match
 * what the CLI `export`/`inspect` produce from the same specs.
 */
export async function ingestAndWrite(specDir: string, outFile: string): Promise<IngestResult> {
  clearSpecCache();
  const res = await ingestDirSpecs(specDir);
  const banner =
    "// AUTO-GENERATED by scripts/gen-brands.ts — do not edit by hand.\n" +
    "// Regenerate after changing design-md/ specs: pnpm gen:brands\n" +
    'import type { BrandTokens } from "./tokens.ts";\n\n' +
    "export const INGESTED: BrandTokens[] = ";
  fs.writeFileSync(outFile, banner + JSON.stringify(res.brands, null, 2) + ";\n");
  return res;
}
