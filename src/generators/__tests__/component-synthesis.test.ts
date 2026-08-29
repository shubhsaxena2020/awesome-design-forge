import { describe, it, expect } from "vitest";
import { loadAllSpecs } from "../../brands/tokens.ts";
import { generateAllComponents, PRIMITIVES, assertNoLayoutThrashing } from "../component-factory.ts";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "..", "..", "..");

describe("req 7 — true per-spec component synthesis across the full corpus", () => {
  const { specs } = loadAllSpecs();

  it("baked the full corpus of specs", () => {
    expect(specs.length).toBeGreaterThanOrEqual(74); // 155 brand specs present
  });

  // Every spec must synthesize to a valid, non-layout-thrashing component kit.
  for (const spec of specs) {
    it(`synthesizes all primitives for "${spec.id}" (font=${spec.typography.heading.fontFamily}, tracking=${spec.typography.heading.letterSpacingEm ?? 0}em)`, () => {
      const kit = generateAllComponents(spec);
      for (const p of PRIMITIVES) {
        const src = kit[p];
        expect(src.length).toBeGreaterThan(0);
        // per-spec typography is baked into the source (heading for most, body for input)
        expect(src, `per-spec font missing for ${p}`).toSatisfy(
          (s: string) => s.includes(spec.typography.heading.fontFamily) || s.includes(spec.typography.body.fontFamily),
        );
        // per-spec tracking (heading or body em) is baked in
        const em = (e: number | undefined) => (e == null ? "0em" : `${e}em`);
        expect(src, `per-spec tracking missing for ${p}`).toSatisfy(
          (s: string) => s.includes(em(spec.typography.heading.letterSpacingEm)) || s.includes(em(spec.typography.body.letterSpacingEm)),
        );
        // no layout-thrashing animations
        expect(() => assertNoLayoutThrashing(src, p)).not.toThrow();
      }
      // the spec's actual palette drives the button variants (not a hardcoded 4-set)
      expect(kit.button).toContain("bg-accent text-accent-foreground");
      expect(kit.button).toContain("bg-muted text-muted-foreground");
      expect(kit.button).toContain("bg-destructive text-destructive-foreground");
    });
  }

  it("REAL OFFLINE COMPILE: a generated component kit (per-spec) builds via @tailwindcss/vite", () => {
    const spec = specs.find((s) => s.id === "linear-dark") ?? specs[0];
    const kit = generateAllComponents(spec);
    const dir = fs.mkdtempSync(path.join(ROOT, ".df-kit-"));
    try {
      const ui = path.join(dir, "components", "ui");
      fs.mkdirSync(ui, { recursive: true });
      for (const p of PRIMITIVES) {
        fs.writeFileSync(path.join(ui, `${p}.tsx`), kit[p].replace(/from "(\.\.\/lib\/cn)"/g, 'from "./cn"'));
      }
      // minimal cn helper
      fs.writeFileSync(path.join(ui, "cn.ts"), `import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\nexport const cn = (...a: ClassValue[]) => twMerge(clsx(a));\n`);
      // a demo app that uses the per-spec kit + the emitted theme
      fs.writeFileSync(path.join(dir, "theme.css"), `@import "tailwindcss";\n:root { --background:#08090a; --foreground:#f7f8f8; --primary:#5e6ad2; --primary-foreground:#ffffff; --secondary:#2c2f36; --secondary-foreground:#f7f8f8; --accent:#7170ff; --accent-foreground:#fff; --muted:#16171a; --muted-foreground:#a0a0ab; --destructive:#e5484d; --destructive-foreground:#fff; --border:#23252a; --input:#23252a; --ring:#5e6ad2; --radius:0.375rem; --font-heading:Inter; --font-body:Inter; }\n.dark { --background:#08090a; --foreground:#f7f8f8; }\n`);
      fs.writeFileSync(path.join(dir, "index.css"), `@import "./theme.css";\n`);
      fs.writeFileSync(
        path.join(dir, "src.tsx"),
        `import * as React from "react";\nimport { createRoot } from "react-dom/client";\nimport "./index.css";\nimport { Button } from "./components/ui/button";\nimport { Card } from "./components/ui/card";\nimport { Input } from "./components/ui/input";\ncreateRoot(document.getElementById("root")!).render(<><Button>Primary</Button><Button variant="accent">Accent</Button><Card><Input placeholder="x" /></Card></>);\n`,
      );
      fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/src.tsx"></script></body></html>`);
      fs.writeFileSync(path.join(dir, "vite.config.ts"), `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport tailwind from "@tailwindcss/vite";\nexport default defineConfig({ plugins: [react(), tailwind()], build: { outDir: "dist" } });\n`);
      execFileSync(path.join(ROOT, "node_modules", ".bin", "vite"), ["build"], { cwd: dir, encoding: "utf8", stdio: "pipe" });
      const assetsDir = path.join(dir, "dist", "assets");
      const jsFile = fs.readdirSync(assetsDir).find((f) => f.endsWith(".js"));
      expect(jsFile, "vite produced a js asset").toBeTruthy();
      const out = fs.readFileSync(path.join(assetsDir, jsFile!), "utf8");
      expect(out.length).toBeGreaterThan(0);
      // per-spec font survived into the bundle
      expect(out).toContain(spec.typography.heading.fontFamily);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
