/**
 * DESIGN.md parser -> DesignSpec.
 *
 * Phase A.2 of the design-forge backlog. Reads a single brand spec (Google
 * DESIGN.md shape: YAML front matter + an optional markdown prose body), and
 * resolves it into the strict `DesignSpec` interface.
 *
 * DESIGN DECISION (offline-first): the backlog suggested "yaml + remark", but
 * `remark` is NOT a dependency of this repo and the project guardrails require
 * 100% local/offline operation (no network installs). We therefore parse the
 * YAML front matter with the already-installed `js-yaml` and extract prose
 * sections with a tiny, dependency-free markdown-AST-lite scanner. This keeps
 * the parser network-free while still honoring the "front matter + markdown
 * body rules" requirement. If remark is later added locally, the prose scanner
 * can be swapped for `remark`/`mdast-util-from-markdown` without changing the
 * public `parseDesignMd` signature.
 *
 * Robustness: real-world specs vary (hex/rgb/hsl/oklch colors, primary vs
 * tertiary vs accent, on-* foregrounds, missing fields, {token} refs). Every
 * field falls back gracefully and foregrounds are contrast-inferred when an
 * explicit `on-*` token is absent. The parser NEVER throws on a malformed
 * brand — it returns a best-effort DesignSpec plus `warnings` (so the test
 * "parse ALL brand files without crashing" can pass even on adversarial input).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import type {
  ColorPalette,
  ComponentSpec,
  CssColor,
  DesignSpec,
  ElevationTokens,
  TypeRole,
  TypographyScale,
} from "../spec/types.ts";

/** Matches the leading YAML front matter block. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
/** Matches a `{a.b.c}` token reference anywhere in a string. */
const REF_RE = /\{([^}]+)\}/g;

/** Parse a CSS length/dimension to px. px passthrough; rem/em * 16; unitless * 1. */
function dimPx(v: string | number | undefined, fallback = 16): number {
  if (v == null) return fallback;
  const s = String(v).trim();
  const n = parseFloat(s);
  if (Number.isNaN(n)) return fallback;
  if (s.endsWith("rem") || s.endsWith("em")) return n * 16;
  if (s.endsWith("pt")) return (n * 16) / 12;
  return n; // px or unitless
}

/** Convert any dimension to a rem string. */
function toRem(v: string | number | undefined, fallback = "0.5rem"): string {
  const s = v == null ? "" : String(v).trim();
  if (!s) return fallback;
  if (s.endsWith("rem") || s.endsWith("em")) return s;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return fallback;
  if (s.endsWith("px")) return `${n / 16}rem`;
  return `${n / 16}rem`; // unitless treated as px
}

/** Resolve `{a.b.c}` references against the parsed token tree. */
function resolveRef(raw: string, root: unknown): string {
  let out = raw;
  out = out.replace(REF_RE, (_m, p: string) => {
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

/** Resolve every {ref} in a record of color strings. */
function resolveColors(colors: Record<string, unknown>, root: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors)) {
    out[k] = resolveRef(String(v ?? ""), root);
  }
  return out;
}

/** Relative luminance (WCAG) from an RGB triple (0..255). */
function relLuminance(r: number, g: number, b: number): number {
  const f = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Parse a CSS color into an RGB triple. Supports hex / rgb()/rgba(). */
export function parseToRgb(color: CssColor): { r: number; g: number; b: number } {
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
  // hsl()/oklch()/named: we cannot cheaply convert offline; return mid-grey so
  // contrast math stays finite (the color engine re-derives these properly).
  return { r: 128, g: 128, b: 128 };
}

/** WCAG contrast ratio between two CSS colors (1..21). */
export function contrastRatio(a: CssColor, b: CssColor): number {
  const la = relLuminance(...Object.values(parseToRgb(a)) as [number, number, number]);
  const lb = relLuminance(...Object.values(parseToRgb(b)) as [number, number, number]);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick a foreground (dark/light) that maximizes contrast on `bg`. */
function onSurface(bg: CssColor, light = "#fafafa", dark = "#0a0a0a"): CssColor {
  return contrastRatio(bg, dark) >= contrastRatio(bg, light) ? dark : light;
}

/** Build a font stack from a family string + sensible fallbacks. */
function buildStack(family: string): string[] {
  const base = family.split(",").map((s) => s.trim()).filter(Boolean);
  const fallbacks = ["ui-sans-serif", "system-ui", "sans-serif"];
  for (const f of fallbacks) if (!base.includes(f)) base.push(f);
  return base;
}

/** Parse one typography role entry. */
function roleFromEntry(
  entry: Record<string, unknown> | undefined,
  fallbackFamily: string,
): TypeRole {
  const fam = (entry?.fontFamily as string) || fallbackFamily;
  const fs = dimPx(entry?.fontSize as string | number | undefined, 16);
  const lsRaw = entry?.letterSpacing as string | number | undefined;
  let letterSpacingEm: number | undefined;
  if (lsRaw != null) {
    const s = String(lsRaw).trim();
    const n = parseFloat(s);
    if (!Number.isNaN(n)) letterSpacingEm = s.endsWith("em") ? n : n / fs; // px -> em
  }
  const lh = entry?.lineHeight as string | number | undefined;
  let lineHeight: number | undefined;
  if (lh != null) {
    const s = String(lh).trim();
    const n = parseFloat(s);
    if (!Number.isNaN(n)) lineHeight = s.endsWith("em") || s.endsWith("rem") || !/\d/.test(s) || parseFloat(s) <= 5 ? n : n / fs;
  }
  return {
    fontFamily: fam,
    fontStack: buildStack(fam),
    fontSizePx: fs,
    fontWeight: entry?.fontWeight != null ? Number(entry.fontWeight) : undefined,
    lineHeight,
    letterSpacingEm,
  };
}

/** Pick the heading role = largest heading-ish token; body = body-ish token. */
function mapTypography(
  typo: Record<string, Record<string, unknown>> | undefined,
  warnings: string[],
): TypographyScale {
  const t = typo ?? {};
  const keys = Object.keys(t);
  const headingKeys = keys.filter((k) => /^(h\d|display|title|heading|hero|jumbo)/i.test(k));
  headingKeys.sort(
    (a, b) =>
      dimPx(t[b]?.fontSize as string | number | undefined, 0) -
      dimPx(t[a]?.fontSize as string | number | undefined, 0),
  );
  const headingKey = headingKeys[0] ?? keys[0];
  const bodyKey =
    keys.find((k) => /^(body|text|paragraph|base|body-md|body-sm)/i.test(k)) ?? headingKey;

  if (!headingKey) {
    warnings.push("typography: no heading/body token found; using Inter defaults");
    const def: TypeRole = {
      fontFamily: "Inter",
      fontStack: buildStack("Inter"),
      fontSizePx: 16,
    };
    return { heading: def, body: def, baseSizePx: 16 };
  }

  const heading = roleFromEntry(t[headingKey], "Inter");
  const body = roleFromEntry(t[bodyKey], heading.fontFamily);
  const roles: Record<string, TypeRole> = {};
  for (const [k, v] of Object.entries(t)) {
    if (k !== headingKey && k !== bodyKey) roles[k] = roleFromEntry(v, heading.fontFamily);
  }
  return { heading, body, roles, baseSizePx: body.fontSizePx };
}

/** Map resolved colors onto the canonical palette with documented fallbacks. */
function mapColors(resolved: Record<string, string>, warnings: string[]): ColorPalette {
  const pick = (keys: string[], fallback: CssColor): CssColor => {
    for (const k of keys) if (resolved[k]) return resolved[k];
    return fallback;
  };
  const mixMid = (a: CssColor, b: CssColor, t: number): CssColor =>
    mixHex(a, b, t);

  const background = pick(["background", "surface", "canvas", "neutral"], "#ffffff");
  const foreground = pick(
    ["on-background", "on-surface", "on-canvas", "on-neutral", "text", "foreground"],
    onSurface(background),
  );
  const primary = pick(["tertiary", "accent", "action", "secondary", "primary"], "#2563eb");
  const secondary = pick(["secondary", "primary"], mixMid(background, primary, 0.5));
  const accent = pick(["accent", "tertiary", "secondary"], primary);
  const muted = pick(["muted", "neutral-200", "surface-200"], mixMid(background, foreground, 0.06));
  const destructive = pick(["error", "danger", "destructive"], "#ef4444");
  const border = pick(["border", "divider"], mixMid(background, foreground, 0.12));

  const extra: Record<string, CssColor> = {};
  for (const [k, v] of Object.entries(resolved)) {
    if (!["background", "surface", "canvas", "neutral", "foreground", "text",
      "primary", "secondary", "accent", "muted", "destructive", "border",
      "tertiary", "action", "error", "danger", "divider"].includes(k)) {
      extra[k] = v;
    }
  }

  if (!resolved.primary && !resolved.tertiary && !resolved.accent) {
    warnings.push("colors: no primary/tertiary/accent declared; using default blue");
  }

  return {
    background,
    foreground,
    primary,
    secondary,
    accent,
    muted,
    destructive,
    border,
    onPrimary: resolved["on-primary"] || resolved["on-tertiary"],
    onSecondary: resolved["on-secondary"],
    onAccent: resolved["on-accent"],
    onMuted: resolved["on-muted"],
    onDestructive: resolved["on-error"] || resolved["on-destructive"],
    extra,
  };
}

/** Mix two hex colors (best-effort; falls back to grey on non-hex). */
export function mixHex(a: CssColor, b: CssColor, t: number): CssColor {
  const ca = parseToRgb(a), cb = parseToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

/** Parse component specs from BOTH the front-matter `components:` map and any
 *  `## Component` prose sections (defensive: specs vary in where they declare
 *  component tokens). */
function extractComponents(
  body: string,
  doc: Record<string, unknown>,
): Record<string, ComponentSpec> {
  const out: Record<string, ComponentSpec> = {};

  // 1) Front-matter components (the documented DESIGN.md shape).
  const fmComps = (doc.components as Record<string, Record<string, unknown>>) ?? {};
  for (const [name, entry] of Object.entries(fmComps)) {
    const tokens: Record<string, string> = {};
    for (const [k, v] of Object.entries(entry)) {
      tokens[k] = resolveRef(String(v ?? ""), doc);
    }
    if (Object.keys(tokens).length) {
      out[name.toLowerCase()] = { tokens };
    }
  }

  // 2) Prose `## name` sections with `key: value` lines (fallback/extra).
  const sections = body.split(/^##\s+/m).slice(1);
  for (const sec of sections) {
    const nl = sec.indexOf("\n");
    const name = sec.slice(0, nl).trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) continue;
    const lines = sec.slice(nl + 1);
    const tokens: Record<string, string> = {};
    for (const line of lines.split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/);
      if (m) tokens[m[1]] = resolveRef(m[2], doc);
    }
    if (Object.keys(tokens).length) {
      const key = name.replace(/^component-/, ""); // normalize "component-button" -> "button"
      out[key] = { tokens };
    }
  }
  return out;
}

/** Slugify a brand name into a stable id. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "brand"
  );
}

/**
 * Parse a DESIGN.md file path into a strict DesignSpec.
 *
 * @param filePath absolute or relative path to the .md spec
 * @returns resolved DesignSpec (never throws; surfaces problems via warnings)
 */
export async function parseDesignMd(filePath: string): Promise<DesignSpec> {
  const source = path.resolve(filePath);
  const warnings: string[] = [];
  let raw = "";
  try {
    raw = await fs.promises.readFile(source, "utf8");
  } catch (e) {
    warnings.push(`read error: ${(e as Error).message}`);
    return emptySpec(source, warnings);
  }

  const fm = raw.match(FRONTMATTER_RE);
  if (!fm) {
    warnings.push("no YAML front matter found; produced minimal spec");
    return emptySpec(source, warnings);
  }

  let doc: Record<string, unknown>;
  try {
    doc = (yaml.load(fm[1]) as Record<string, unknown>) ?? {};
  } catch (e) {
    warnings.push(`YAML parse error: ${(e as Error).message}`);
    return emptySpec(source, warnings);
  }

  const body = raw.slice(fm[0].length);
  const colorsRaw = (doc.colors as Record<string, unknown>) ?? {};
  const resolvedColors = resolveColors(colorsRaw, doc);

  const name = (doc.name as string) || slugify(source.split(/[\\/]/).pop() ?? "brand");
  const id = (doc.id as string) || slugify(name);
  const description = (doc.description as string) ?? "";

  const colors = mapColors(resolvedColors, warnings);
  const typography = mapTypography(doc.typography as Record<string, Record<string, unknown>>, warnings);

  const rounded = (doc.rounded as Record<string, string | number>) ?? {};
  const radKey =
    ["md", "lg", "base", "sm", "xl"].find((k) => rounded[k] != null) ?? Object.keys(rounded)[0];
  const elevation: ElevationTokens = {
    radius: radKey != null ? toRem(rounded[radKey] as string) : "0.5rem",
    radii: Object.fromEntries(
      Object.entries(rounded).map(([k, v]) => [k, toRem(v as string)]),
    ),
    shadows: doc.shadows as Record<string, string> | undefined,
  };

  const components = extractComponents(body, doc);

  if (!doc.name) warnings.push(`spec missing 'name' (using id '${id}')`);

  return {
    id,
    name,
    description,
    source,
    version: doc.version as string | undefined,
    colors,
    typography,
    elevation,
    components,
    warnings,
  };
}

/** Minimal valid spec used when a file cannot be parsed at all. */
function emptySpec(source: string, warnings: string[]): DesignSpec {
  return {
    id: slugify(source.split(/[\\/]/).pop() ?? "brand"),
    name: "Unknown",
    description: "",
    source,
    colors: mapColors({}, warnings),
    typography: mapTypography(undefined, warnings),
    elevation: { radius: "0.5rem" },
    components: {},
    warnings,
  };
}

/** Discover every brand .md under a directory (recursive). Read-only. */
export async function discoverBrandFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (p: string) => {
    const ents = await fs.promises.readdir(p, { withFileTypes: true });
    for (const e of ents) {
      const fp = path.join(p, e.name);
      if (e.isDirectory()) await walk(fp);
      else if (e.name.toLowerCase().endsWith(".md")) out.push(fp);
    }
  };
  try {
    await walk(dir);
  } catch {
    /* directory missing -> empty */
  }
  return out.sort();
}
