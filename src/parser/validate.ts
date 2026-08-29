/**
 * Explicit spec validation pass.
 *
 * The parser (design-parser.ts) is intentionally LENIENT: it never throws and
 * always returns a best-effort DesignSpec plus `warnings`. That is right for
 * ingestion, but it means a malformed brand can silently produce a wrong theme.
 *
 * This module is the STRICT counterpart required by the roadmap (item #2):
 * `validateDesignSpec` fails fast with precise messages on truly invalid specs,
 * and is a PURE function — passing a valid spec through it leaves the spec
 * completely unchanged (it only reads).
 *
 * "Invalid" here means: structurally required fields missing, color values that
 * are not real CSS colors, a radius that is not a CSS length, or a foreground/
 * background pair that fails WCAG AA *where we can compute it offline* (i.e.
 * both colors are hex/rgb — hsl()/oklch() are off the offline table and skipped
 * rather than falsely flagged).
 */

import type { ColorPalette, DesignSpec } from "../spec/types.ts";
import { contrastRatio, parseToRgb } from "./design-parser.ts";

export interface ValidationError {
  path: string;
  message: string;
}

/** A CSS color we can actually reason about offline (hex + rgb()/rgba()). */
function isOfflineColor(c: string): boolean {
  return /^#?[0-9a-fA-F]{3,8}$/.test(c.trim()) || /^rgba?\([^)]+\)/i.test(c.trim());
}

function isValidColor(c: string): boolean {
  const t = c.trim();
  if (t === "") return false;
  // accept hex, rgb()/rgba(), hsl()/hsla(), oklch()/oklab(), named-ish tokens
  return (
    /^#?[0-9a-fA-F]{3,8}$/.test(t) ||
    /^rgba?\([^)]+\)/i.test(t) ||
    /^hsla?\([^)]+\)/i.test(t) ||
    /^oklch?\([^)]+\)/i.test(t) ||
    /^oklab\([^)]+\)/i.test(t) ||
    /^[a-z]+$/i.test(t) // single-word named color (white/black/...); cheap allow
  );
}

function isCssLength(v: string): boolean {
  return /^(\d*\.?\d+)(px|rem|em|%|pt|ch|vh|vw)$/.test(v.trim()) || /^\d*\.?\d+$/.test(v.trim());
}

function push(errors: ValidationError[], path: string, message: string) {
  errors.push({ path, message });
}

function validateColors(colors: ColorPalette, errors: ValidationError[]) {
  const required: (keyof ColorPalette)[] = [
    "background",
    "foreground",
    "primary",
    "secondary",
    "accent",
    "muted",
    "destructive",
    "border",
  ];
  for (const k of required) {
    const v = colors[k];
    if (v == null || String(v).trim() === "") {
      push(errors, `colors.${k}`, `missing required color`);
    } else if (!isValidColor(String(v))) {
      push(errors, `colors.${k}`, `not a valid CSS color: "${v}"`);
    }
  }
  // Every present color (including extra/mapped) must be a real CSS color.
  // `extra` is a nested record of named colors, validated separately below.
  const all = colors as unknown as Record<string, string | undefined>;
  for (const [k, v] of Object.entries(all)) {
    if (k === "extra") continue;
    if (v != null && String(v).trim() !== "" && !isValidColor(String(v))) {
      push(errors, `colors.${k}`, `not a valid CSS color: "${v}"`);
    }
  }
  // Validate the named colors nested under `extra`.
  const extra = colors.extra as unknown as Record<string, string> | undefined;
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (!isValidColor(String(v))) push(errors, `colors.extra.${k}`, `not a valid CSS color: "${v}"`);
    }
  }
  // Contrast checks only where we can compute offline.
  const pairs: [string, string][] = [
    ["background", "foreground"],
    ["primary", "onPrimary"],
    ["secondary", "onSecondary"],
    ["accent", "onAccent"],
    ["muted", "onMuted"],
    ["destructive", "onDestructive"],
  ];
  for (const [a, b] of pairs) {
    const ca = (colors as unknown as Record<string, string | undefined>)[a];
    const cb = (colors as unknown as Record<string, string | undefined>)[b];
    if (ca && cb && isOfflineColor(ca) && isOfflineColor(cb)) {
      // skip pure-grey fallback (128,128,128) means engine couldn't parse; don't false-flag
      const ra = parseToRgb(ca as string);
      const rb = parseToRgb(cb as string);
      const grey = (x: { r: number; g: number; b: number }) => x.r === 128 && x.g === 128 && x.b === 128;
      if (!grey(ra) && !grey(rb)) {
        const ratio = contrastRatio(ca as string, cb as string);
        if (ratio < 4.5) {
          push(errors, `colors.${a}/${b}`, `contrast ${ratio.toFixed(2)}:1 below WCAG AA 4.5:1`);
        }
      }
    }
  }
}

/** Validate a DesignSpec. Returns a list of precise errors (empty => valid). */
export function validateDesignSpec(spec: DesignSpec): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!spec.id || String(spec.id).trim() === "") push(errors, "id", "missing required brand id");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(spec.id ?? ""))) {
    push(errors, "id", `id "${spec.id}" must match [a-z0-9][a-z0-9-]*`);
  }
  if (!spec.name || String(spec.name).trim() === "") push(errors, "name", "missing required brand name");

  if (!spec.colors) push(errors, "colors", "missing required colors");
  else validateColors(spec.colors, errors);

  if (spec.elevation?.radius != null && !isCssLength(String(spec.elevation.radius))) {
    push(errors, "elevation.radius", `not a valid CSS length: "${spec.elevation.radius}"`);
  }

  if (spec.typography) {
    for (const role of ["heading", "body"] as const) {
      const r = spec.typography[role];
      if (r && (!r.fontFamily || String(r.fontFamily).trim() === "")) {
        push(errors, `typography.${role}.fontFamily`, "missing font family");
      }
    }
  }

  return errors;
}

/** Throw a grouped error if the spec is invalid. Pure w.r.t. `spec`. */
export function assertValidDesignSpec(spec: DesignSpec): void {
  const errors = validateDesignSpec(spec);
  if (errors.length) {
    const detail = errors.map((e) => `  - ${e.path}: ${e.message}`).join("\n");
    throw new SpecValidationError(`${errors.length} validation error(s):\n${detail}`, errors);
  }
}

export class SpecValidationError extends Error {
  constructor(message: string, public readonly errors: ValidationError[]) {
    super(message);
    this.name = "SpecValidationError";
  }
}

/** Validate a spec and return a human-readable report (for CLI output). */
export function formatValidationReport(spec: DesignSpec): { ok: boolean; lines: string[] } {
  const errors = validateDesignSpec(spec);
  if (!errors.length) {
    return { ok: true, lines: [`✓ ${spec.id} valid`] };
  }
  return {
    ok: false,
    lines: [`✗ ${spec.id} invalid (${errors.length}):`, ...errors.map((e) => `  - ${e.path}: ${e.message}`)],
  };
}
