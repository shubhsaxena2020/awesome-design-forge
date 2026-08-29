/**
 * Token diff between two brand configurations.
 *
 * Roadmap item #7: "see what changed between two brand configurations before
 * publishing" — highlights additions, removals, and value changes WITHOUT
 * hiding unchanged structure.
 *
 * Works on BrandTokens (the synthesized token output) and/or DesignSpecs.
 * Pure + offline; no DOM. The showroom and the CLI `diff` command both use it.
 */

import type { DesignSpec } from "../spec/types.ts";
import type { BrandTokens } from "../brands/tokens.ts";

export type ChangeKind = "added" | "removed" | "changed" | "unchanged";

export interface TokenChange {
  path: string;
  kind: ChangeKind;
  from?: string;
  to?: string;
}

/** Flatten BrandTokens into `dotted.path -> string` for stable comparison. */
export function flattenTokens(b: BrandTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.colors)) out[`colors.${k}`] = String(v);
  out["radius"] = String(b.radius);
  out["typography.heading"] = b.typography.heading;
  out["typography.body"] = b.typography.body;
  out["typography.baseSize"] = String(b.typography.baseSize);
  return out;
}

/** Flatten the comparable parts of a DesignSpec (colors + radius + type). */
export function flattenSpec(s: DesignSpec): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s.colors)) out[`colors.${k}`] = String(v);
  if (s.elevation?.radius != null) out["elevation.radius"] = String(s.elevation.radius);
  out["typography.heading.fontFamily"] = s.typography.heading.fontFamily;
  out["typography.body.fontFamily"] = s.typography.body.fontFamily;
  return out;
}

function diffFlat(a: Record<string, string>, b: Record<string, string>): TokenChange[] {
  const paths = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: TokenChange[] = [];
  for (const p of [...paths].sort()) {
    const av = a[p];
    const bv = b[p];
    if (av === undefined && bv !== undefined) out.push({ path: p, kind: "added", to: bv });
    else if (av !== undefined && bv === undefined) out.push({ path: p, kind: "removed", from: av });
    else if (av !== bv) out.push({ path: p, kind: "changed", from: av, to: bv });
    else out.push({ path: p, kind: "unchanged", from: av, to: bv });
  }
  return out;
}

export function diffTokens(a: BrandTokens, b: BrandTokens): TokenChange[] {
  return diffFlat(flattenTokens(a), flattenTokens(b));
}

export function diffSpecs(a: DesignSpec, b: DesignSpec): TokenChange[] {
  return diffFlat(flattenSpec(a), flattenSpec(b));
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

export function summarizeDiff(changes: TokenChange[]): DiffSummary {
  const s: DiffSummary = { added: 0, removed: 0, changed: 0, unchanged: 0 };
  for (const c of changes) s[c.kind]++;
  return s;
}

/** Terminal-/markdown-friendly rendering of a diff (offline, no browser). */
export function formatDiff(changes: TokenChange[], opts: { onlyChanged?: boolean } = {}): string {
  const lines = changes
    .filter((c) => !opts.onlyChanged || c.kind !== "unchanged")
    .map((c) => {
      switch (c.kind) {
        case "added":
          return `+ ${c.path} = ${c.to}`;
        case "removed":
          return `- ${c.path} (was ${c.from})`;
        case "changed":
          return `~ ${c.path}: ${c.from} -> ${c.to}`;
        default:
          return `  ${c.path} = ${c.from}`;
      }
    });
  return lines.join("\n");
}
