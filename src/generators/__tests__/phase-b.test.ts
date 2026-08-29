import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { parseDesignMd } from "../../parser/design-parser.ts";
import {
  emitTailwindV4Theme,
  emitTailwindConfigLegacy,
} from "../tailwind-generator.ts";
import { emitThemeCssForSpec } from "../css-variables.ts";
import { oklchChannels } from "../../transformers/color-engine.ts";
import type { DesignSpec } from "../../spec/types.ts";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DESIGN_MD = path.join(ROOT, "design-md");

const SHADCN_VARS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover",
  "--popover-foreground", "--primary", "--primary-foreground", "--secondary",
  "--secondary-foreground", "--muted", "--muted-foreground", "--accent",
  "--accent-foreground", "--destructive", "--destructive-foreground", "--border",
  "--input", "--ring", "--radius",
];

describe("req B.5/B.6 — Phase A DesignSpec -> Tailwind v4 theme + shadcn css vars", () => {
  let spec: DesignSpec;

  beforeAll(async () => {
    spec = await parseDesignMd(path.join(DESIGN_MD, "linear-dark.md"));
  });

  it("emits a Tailwind v4 @theme block containing every shadcn color token", () => {
    const css = emitTailwindV4Theme(spec);
    expect(css).toContain("@import \"tailwindcss\";");
    expect(css).toContain("@theme {");
    // Every shadcn color token (except --radius, which becomes --radius-lg/md/sm
    // in the v4 theme) must be present as a --color-* utility namespace.
    for (const v of SHADCN_VARS.filter((x) => x !== "--radius")) {
      expect(css, `missing ${v}`).toContain(`--color-${v.replace(/^--/, "")}:`);
    }
    // oklch values present and well-formed.
    const primaryOk = oklchChannels(spec.colors.primary);
    expect(css).toContain(`oklch(${primaryOk})`);
    // radius steps derived from the brand radius.
    expect(css).toContain("--radius-lg:");
  });

  it("emits a legacy tailwind.config.ts that is valid TypeScript (parseable by tsx)", () => {
    const cfg = emitTailwindConfigLegacy(spec);
    expect(cfg).toContain("darkMode: \"class\"");
    expect(cfg).toContain("export default config;");
    expect(cfg).toContain("colors:");
    // Real parse: write inside the project (so `tailwindcss` import resolves)
    // and execute via the locally-installed tsx binary (offline, no fetch).
    const tmp = path.join(ROOT, `df-cfg-${Date.now()}.ts`);
    fs.writeFileSync(tmp, cfg);
    try {
      execFileSync(path.join(ROOT, "node_modules", ".bin", "tsx"), [tmp], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: "pipe",
      });
    } catch (e) {
      throw new Error(`legacy config failed to parse: ${(e as Error).message}`);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });

  it("emits a shadcn css-variables theme (light + dark) for the spec", () => {
    const css = emitThemeCssForSpec(spec);
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
    for (const v of SHADCN_VARS) {
      expect(css, `:root missing ${v}`).toContain(`${v}:`);
      expect(css, `.dark missing ${v}`).toContain(`${v}:`);
    }
    // oklch channel triples (not raw hex) per the shadcn v4 convention.
    expect(css).toMatch(/--primary:\s*[\d.]+ [\d.]+ [\d.]+;/);
  });

  it("REAL OFFLINE COMPILE: the generated @theme compiles via the installed @tailwindcss/vite engine to valid CSS", () => {
    // Build a throwaway Vite project that consumes the generated theme and a
    // utility class, then run `vite build` (offline — uses installed deps).
    // Must live under ROOT so node module resolution finds @tailwindcss/vite.
    const dir = fs.mkdtempSync(path.join(ROOT, ".df-vite-"));
    const theme = emitTailwindV4Theme(spec);
    fs.writeFileSync(
      path.join(dir, "index.css"),
      `${theme}\n\n@layer utilities {\n  .demo { background-color: var(--color-primary); color: var(--color-primary-foreground); border-radius: var(--radius-md); }\n}\n`,
    );
    fs.writeFileSync(
      path.join(dir, "index.html"),
      `<!doctype html><html><head><link rel="stylesheet" href="./index.css"></head><body><div class="demo">hi</div></body></html>`,
    );
    fs.writeFileSync(
      path.join(dir, "vite.config.ts"),
      `import { defineConfig } from "vite";\nimport tailwind from "@tailwindcss/vite";\nexport default defineConfig({ plugins: [tailwind()], build: { outDir: "dist" } });\n`,
    );
    try {
      execFileSync(path.join(ROOT, "node_modules", ".bin", "vite"), ["build"], {
        cwd: dir,
        encoding: "utf8",
        stdio: "pipe",
      });
      const assetsDir = path.join(dir, "dist", "assets");
      const cssFile = fs.readdirSync(assetsDir).find((f) => f.endsWith(".css"));
      expect(cssFile, "vite produced a css asset").toBeTruthy();
      const outCss = fs.readFileSync(path.join(assetsDir, cssFile!), "utf8");
      expect(outCss.length).toBeGreaterThan(0);
      // The brand tokens survive compilation: the @theme var name is present in
      // the real output CSS (Tailwind inlines the oklch var into utilities).
      expect(outCss).toContain("--color-primary");
    } catch (e) {
      throw new Error(`vite build failed (offline): ${(e as Error).message}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
