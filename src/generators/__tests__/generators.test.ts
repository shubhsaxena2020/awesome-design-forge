import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { BRANDS, getBrand } from "../../brands/tokens.ts";
import { loadAllBrands } from "../../brands/tokens.ts";
import { ingestDir } from "../../brands/ingest.ts";
import { emitThemeCss, emitLightVars, emitDarkVars } from "../css-variables.ts";
import {
  generateComponent,
  generateAllComponents,
  assertNoLayoutThrashing,
  PRIMITIVES,
} from "../component-factory.ts";

const SHADCN_VARS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover",
  "--popover-foreground", "--primary", "--primary-foreground", "--secondary",
  "--secondary-foreground", "--muted", "--muted-foreground", "--accent",
  "--accent-foreground", "--destructive", "--destructive-foreground", "--border",
  "--input", "--ring", "--radius",
];

describe("req 6 — shadcn CSS variable theme emitter", () => {
  const block = (css: string, sel: string): string => {
    const i = css.indexOf(`${sel} {`);
    const start = css.indexOf("{", i) + 1;
    const end = css.indexOf("}", start);
    return css.slice(start, end);
  };

  for (const b of BRANDS) {
    it(`emits all standard shadcn vars for "${b.id}" (light + dark)`, () => {
      const css = emitThemeCss(b);
      const light = block(css, ":root");
      const dark = block(css, ".dark");
      for (const v of SHADCN_VARS) {
        expect(light, `:root missing ${v}`).toContain(`${v}:`);
        expect(dark, `.dark missing ${v}`).toContain(`${v}:`);
      }
    });

    it(`values are oklch() triples for "${b.id}"`, () => {
      const light = emitLightVars(b);
      const dark = emitDarkVars(b);
      for (const block of [light, dark]) {
        for (const line of block.split("\n")) {
          const m = line.match(/--([a-z-]+):\s*(.+);/);
          if (!m) continue;
          // color vars must be oklch(L C H); --radius/--font-* are exceptions
          if (m[1] === "radius") continue;
          if (m[1].startsWith("font-")) continue;
          expect(m[2], `${m[1]} should be oklch(L C H)`).toMatch(/^\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/);
        }
      }
    });

    it(`dark mode flips background vs light for "${b.id}"`, () => {
      const lightBg = emitLightVars(b).match(/--background:\s*([^;]+);/)![1];
      const darkBg = emitDarkVars(b).match(/--background:\s*([^;]+);/)![1];
      expect(lightBg).not.toEqual(darkBg);
    });
  }

  it("compiles against standard shadcn component contract (vars referenced, not raw hex)", () => {
    const css = emitThemeCss(getBrand("aurora"));
    // shadcn components consume var(--x); our .df-surface proves the contract.
    expect(css).toContain("oklch(var(--background))");
    expect(css).toContain("oklch(var(--primary))");
    expect(css).toContain("oklch(var(--border))");
    expect(css).toContain("var(--radius)");
  });
});

describe("req 7 — component synthesizer has no layout-thrashing animations", () => {
  for (const p of PRIMITIVES) {
    it(`"${p}" passes the layout-thrash guard`, () => {
      const src = generateComponent(p);
      expect(() => assertNoLayoutThrashing(src, p)).not.toThrow();
    });
  }

  it("all primitives generate without error", () => {
    const all = generateAllComponents();
    expect(Object.keys(all).sort()).toEqual([...PRIMITIVES].sort());
  });

  it("DETECTS a banned animated property (width in @keyframes)", () => {
    const bad = `@keyframes grow { from { width: 10px } to { width: 100px } }`;
    expect(() => assertNoLayoutThrashing(bad, "test")).toThrow(/width/);
  });

  it("DETECTS a banned transition property", () => {
    const bad = `.x { transition: [width, opacity] 200ms; }`;
    expect(() => assertNoLayoutThrashing(bad, "test")).toThrow(/width/);
  });

  it("ALLOWS transform/opacity animations (no false positive)", () => {
    const good = `@keyframes pop { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: scale(1) } }`;
    expect(() => assertNoLayoutThrashing(good, "test")).not.toThrow();
  });
});

describe("req B (new) — DESIGN.md ingester", () => {
  const CORPUS = path.resolve(__dirname, "../../../design-md");
  const { brands, files } = ingestDir(CORPUS);

  it("ingests the design-md corpus (8 specs: starter + 7 brands)", () => {
    expect(files).toBeGreaterThanOrEqual(8);
    expect(brands.length).toBeGreaterThanOrEqual(8);
  });

  it("every ingested brand yields a complete, valid BrandTokens", () => {
    for (const b of brands) {
      expect(b.id).toBeTruthy();
      expect(b.name).toBeTruthy();
      for (const key of ["background", "foreground", "primary", "secondary", "accent", "muted", "destructive", "border"] as const) {
        expect(b.colors[key], `${b.id}.colors.${key}`).toBeTruthy();
      }
      expect(b.radius).toMatch(/rem$/);
      expect(b.typography.heading).toBeTruthy();
      expect(b.typography.body).toBeTruthy();
      expect(b.typography.baseSize).toBeGreaterThan(0);
    }
  });

  it("every ingested brand compiles to a full shadcn theme (req 6) and clean components (req 7)", () => {
    for (const b of brands) {
      const css = emitThemeCss(b);
      for (const v of ["--background", "--foreground", "--primary", "--border", "--radius"]) {
        expect(css, `${b.id} ${v}`).toContain(v);
      }
      const all = generateAllComponents();
      for (const src of Object.values(all)) {
        expect(() => assertNoLayoutThrashing(src as string, b.id)).not.toThrow();
      }
    }
  });

  it("resolves {token} references from specs (linear-dark uses them)", () => {
    const linear = brands.find((b) => b.id === "linear-dark");
    expect(linear).toBeTruthy();
    // tertiary (#5E6AD2 indigo) is the interaction color -> shadcn --primary
    expect(linear!.colors.primary.toLowerCase()).toBe("#5e6ad2");
    expect(linear!.colors.foreground).toBeTruthy();
  });

  it("canonical DESIGN.md semantics: tertiary->--primary, primary->--foreground", () => {
    // heritage: primary=#1A1C1E (ink) is core TEXT; tertiary=#B8422E is ACTION.
    const heritage = brands.find((b) => b.id === "heritage")!;
    expect(heritage.colors.foreground.toLowerCase()).toBe("#1a1c1e"); // core text
    expect(heritage.colors.primary.toLowerCase()).toBe("#b8422e"); // action color
    // radius from rounded.md (8px -> 0.5rem)
    expect(heritage.radius).toBe("0.5rem");
  });

  it("infers foreground via WCAG when on-* keys are absent (nimbus oklch)", () => {
    const nimbus = brands.find((b) => b.id === "nimbus")!;
    // neutral is near-white -> foreground inferred dark
    expect(nimbus.colors.foreground.toLowerCase()).toBe("#0a0a0a");
    // tertiary (azure) is the action color -> --primary
    expect(nimbus.colors.primary.startsWith("oklch")).toBe(true);
  });

  it("loadAllBrands() merges baked ingested.ts (fs-free)", () => {
    const { brands: all, ingested } = loadAllBrands();
    expect(ingested).toBeGreaterThanOrEqual(8);
    expect(all.find((b) => b.id === "linear-dark")).toBeTruthy();
    expect(all.find((b) => b.id === "aurora")).toBeTruthy();
  });

  it("degrades gracefully on non-spec .md files (prose-only / empty tokens)", () => {
    const adv = path.resolve(__dirname, "../../../design-md-adversarial");
    const res = ingestDir(adv);
    expect(res.brands.length).toBe(0); // neither file yields a brand
    expect(res.warnings.length).toBeGreaterThan(0); // but warnings are recorded
    expect(res.files).toBe(2);
  });
});

describe("req 13 — CLI ingest guards a missing directory", () => {
  it("exits non-zero with a clear message when the dir does not exist", () => {
    const cli = path.resolve(__dirname, "../../cli/index.ts");
    let code = 0;
    let out = "";
    try {
      out = execFileSync("npx", ["tsx", cli, "ingest", "/path/does/not/exist"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e: any) {
      code = e.status ?? 1;
      out = (e.stderr ?? "") + (e.stdout ?? "");
    }
    expect(code).not.toBe(0);
    expect(out).toContain("Spec directory not found");
  }, 30000);
});

