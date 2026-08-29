import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const CLI = path.join(ROOT, "src", "cli", "index.ts");
const TSX = path.join(ROOT, "node_modules", ".bin", "tsx");

const SHADCN_VARS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover",
  "--popover-foreground", "--primary", "--primary-foreground", "--secondary",
  "--secondary-foreground", "--muted", "--muted-foreground", "--accent",
  "--accent-foreground", "--destructive", "--destructive-foreground", "--border",
  "--input", "--ring", "--radius",
];

describe("req 10 — design-forge CLI ingests a DESIGN.md spec and exports a working project", () => {
  const SPEC = path.join(ROOT, "design-md", "linear-dark.md");
  let target: string;

  beforeAll(() => {
    target = fs.mkdtempSync(path.join(ROOT, ".df-export-"));
    execFileSync(TSX, [CLI, "export", SPEC, "--target", target, "--framework", "vite"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
  });

  afterAll(() => {
    if (target) fs.rmSync(target, { recursive: true, force: true });
  });

  it("writes the full scaffold from a .md spec path", () => {
    expect(fs.existsSync(path.join(target, "styles", "theme.css"))).toBe(true);
    expect(fs.existsSync(path.join(target, "styles", "globals.css"))).toBe(true);
    expect(fs.existsSync(path.join(target, "styles", "brand.json"))).toBe(true);
    for (const p of ["button", "card", "input", "modal", "navbar"]) {
      expect(fs.existsSync(path.join(target, "components", "ui", `${p}.tsx`))).toBe(true);
    }
    // brand.json is the bridged BrandTokens (name resolved from the spec).
    const brand = JSON.parse(fs.readFileSync(path.join(target, "styles", "brand.json"), "utf8"));
    expect(brand.id).toBe("linear-dark");
    expect(brand.colors.primary).toBe("#5e6ad2");
  });

  it("emitted theme.css carries standard shadcn vars in BOTH :root and .dark", () => {
    const css = fs.readFileSync(path.join(target, "styles", "theme.css"), "utf8");
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
    for (const v of SHADCN_VARS) {
      expect(css, `:root missing ${v}`).toContain(`${v}:`);
      expect(css, `.dark missing ${v}`).toContain(`${v}:`);
    }
  });

  it("REAL OFFLINE COMPILE: the exported theme.css + globals.css compile via @tailwindcss/vite", () => {
    // Build a throwaway Vite project that imports the ACTUAL exported artifacts
    // (offline; uses installed @tailwindcss/vite). Proves the export output is
    // real, compilable CSS — not just a string.
    const dir = fs.mkdtempSync(path.join(ROOT, ".df-export-build-"));
    try {
      fs.writeFileSync(
        path.join(dir, "index.css"),
        `@import "./theme.css";\n@import "./globals.css";\n\n@layer utilities {\n  .demo { background-color: var(--color-primary); color: var(--color-primary-foreground); border-radius: var(--radius-md); }\n}\n`,
      );
      // copy the exported artifacts next to index.css
      fs.copyFileSync(path.join(target, "styles", "theme.css"), path.join(dir, "theme.css"));
      fs.copyFileSync(path.join(target, "styles", "globals.css"), path.join(dir, "globals.css"));
      fs.writeFileSync(
        path.join(dir, "index.html"),
        `<!doctype html><html><head><link rel="stylesheet" href="./index.css"></head><body><div class="demo">hi</div></body></html>`,
      );
      fs.writeFileSync(
        path.join(dir, "vite.config.ts"),
        `import { defineConfig } from "vite";\nimport tailwind from "@tailwindcss/vite";\nexport default defineConfig({ plugins: [tailwind()], build: { outDir: "dist" } });\n`,
      );
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
      expect(outCss).toContain("--color-primary");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to overwrite a non-empty existing target without --force", () => {
    // Seed an existing file in the target.
    const occupied = fs.mkdtempSync(path.join(ROOT, ".df-export-occ-"));
    fs.writeFileSync(path.join(occupied, "existing.txt"), "do not clobber");
    let threw = false;
    try {
      execFileSync(
        TSX,
        [CLI, "export", SPEC, "--target", occupied, "--framework", "vite"],
        { cwd: ROOT, encoding: "utf8", stdio: "pipe" },
      );
    } catch (e) {
      threw = true;
      const err = e as { status?: number; stderr?: string };
      expect(err.status).toBe(1);
      expect(err.stderr ?? "").toContain("Refusing to overwrite");
    } finally {
      fs.rmSync(occupied, { recursive: true, force: true });
    }
    expect(threw, "export should abort on a non-empty target").toBe(true);
  });
});
