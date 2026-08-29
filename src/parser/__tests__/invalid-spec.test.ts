import { describe, it, expect } from "vitest";
import { parseDesignMd } from "../../parser/design-parser.ts";
import {
  validateDesignSpec,
  assertValidDesignSpec,
  SpecValidationError,
  formatValidationReport,
} from "../../parser/validate.ts";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { DesignSpec } from "../../spec/types.ts";

/**
 * Backlog B6: an INVALID DESIGN.md must fail validation GRACEFULLY — the parser
 * never throws (best-effort), but `validateDesignSpec` / `assertValidDesignSpec`
 * catch the problems with precise, readable messages and never mutate the spec.
 */
describe("invalid DESIGN.md fails validation gracefully (backlog B6)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "df-invalid-"));

  it("flags an invalid color emitted by the parser", async () => {
    const f = path.join(dir, "bad.md");
    fs.writeFileSync(
      f,
      `---\nname: Bad\nid: bad\ncolors:\n  primary: "not-a-color"\n  background: "#fff"\n  foreground: "#000"\nelevation:\n  radius: "lol"\n---\n`,
    );
    const spec = await parseDesignMd(f);
    const errors = validateDesignSpec(spec);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.path === "colors.primary")).toBe(true);
  });

  it("validator flags a present-but-invalid radius (radius rule)", () => {
    // Build a spec where the bad radius is preserved (not silently normalized)
    // to exercise the validator's radius branch directly.
    const spec = {
      id: "r",
      name: "R",
      colors: {
        background: "#ffffff",
        foreground: "#101010",
        primary: "#2563eb",
        onPrimary: "#ffffff",
        secondary: "#6b7280",
        onSecondary: "#ffffff",
        accent: "#7c3aed",
        onAccent: "#ffffff",
        muted: "#f3f4f6",
        onMuted: "#111827",
        destructive: "#b91c1c",
        onDestructive: "#ffffff",
        border: "#e5e7eb",
      },
      elevation: { radius: "lol" },
    } as unknown as DesignSpec;
    const errors = validateDesignSpec(spec);
    expect(errors.some((e) => e.path === "elevation.radius")).toBe(true);
  });

  it("assertValidDesignSpec throws SpecValidationError (does not crash with a raw TypeError)", async () => {
    const f = path.join(dir, "bad2.md");
    fs.writeFileSync(f, `---\nname: Bad2\nid: bad2\ncolors:\n  primary: "rgb(not,valid"\n---\n`);
    const spec = await parseDesignMd(f);
    expect(() => assertValidDesignSpec(spec)).toThrow(SpecValidationError);
  });

  it("leaves the input spec unchanged (pure function) even when invalid", async () => {
    const f = path.join(dir, "bad3.md");
    fs.writeFileSync(f, `---\nname: Bad3\nid: bad3\ncolors:\n  primary: "nope"\n---\n`);
    const spec = await parseDesignMd(f);
    const snapshot = JSON.stringify(spec);
    validateDesignSpec(spec);
    expect(JSON.stringify(spec)).toBe(snapshot);
  });

  it("formatValidationReport reads as a human-readable list", async () => {
    const f = path.join(dir, "bad4.md");
    fs.writeFileSync(f, `---\nname: Bad4\nid: bad4\ncolors:\n  primary: "??"\n---\n`);
    const spec = await parseDesignMd(f);
    const r = formatValidationReport(spec);
    expect(r.ok).toBe(false);
    expect(r.lines.join("\n")).toContain("colors.primary");
  });

  it("a syntactically-unparseable YAML still yields a best-effort spec + warning, not a crash", async () => {
    const f = path.join(dir, "broken.md");
    fs.writeFileSync(f, `this is not front matter at all\nrandom prose about a brand\n`);
    const spec = await parseDesignMd(f);
    expect(spec.id).toBeTruthy(); // fallbackSpec kept it ingestible
    expect(spec.warnings.length).toBeGreaterThan(0);
  });
});
