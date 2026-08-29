#!/usr/bin/env -S npx tsx
import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { getBrand, loadAllBrands, loadAllSpecs, type BrandTokens } from "../brands/tokens.ts";
import { ingestAndWrite } from "../brands/ingest.ts";
import { emitThemeCss, emitTailwindTheme } from "../generators/css-variables.ts";
import {
  generateComponent,
  PRIMITIVES,
} from "../generators/component-factory.ts";
import { parseDesignMd, discoverBrandFiles } from "../parser/design-parser.ts";
import { specToBrandTokens } from "../generators/adapter.ts";
import { formatValidationReport, assertValidDesignSpec, SpecValidationError } from "../parser/validate.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Resolve a brand by id from the merged built-in + ingested set. */
function resolveBrand(id: string): BrandTokens {
  const { brands } = loadAllBrands();
  const b = brands.find((x) => x.id === id);
  if (b) return b;
  return getBrand(id); // built-in fallback (throws if unknown)
}

/**
 * Resolve a CLI arg to a BrandTokens.
 *
 * Two input shapes are supported so the pipeline can ingest ANY spec:
 *   1. a brand id (built-in or previously ingested into ingested.ts), or
 *   2. a path to a DESIGN.md file — parsed via the Phase A parser into a
 *      DesignSpec, then bridged to BrandTokens via specToBrandTokens.
 * This is the concrete "ingest any of the 74 brand specifications" entry point.
 */
async function resolveBrandOrFile(arg: string): Promise<BrandTokens> {
  if (arg.endsWith(".md") && fs.existsSync(arg) && fs.statSync(arg).isFile()) {
    const spec = await parseDesignMd(arg);
    return specToBrandTokens(spec);
  }
  return resolveBrand(arg);
}

function ok(s: string) {
  process.stdout.write(s + "\n");
}

// ---- list ----
function cmdList() {
  const { brands, ingested, warnings } = loadAllBrands();
  ok("Reference brands:");
  for (const b of brands) {
    ok(`  • ${b.id.padEnd(13)} ${b.name.padEnd(14)} ${b.description}`);
  }
  ok("");
  const total = brands.length;
  if (ingested > 0) ok(`${total} brands (${ingested} ingested from design-md/). Inspect one with: design-forge inspect <id>`);
  else ok(`${total} built-in brands. Inspect one with: design-forge inspect <id>`);
  for (const w of warnings) ok(`  ! ${w}`);
}

// ---- validate ----
async function cmdValidate(arg: string, opts: { strict?: boolean }) {
  const files = arg.endsWith(".md") && fs.existsSync(arg) && fs.statSync(arg).isFile()
    ? [arg]
    : await discoverBrandFiles(arg);
  if (!files.length) {
    console.error(`! No brand specs found at: ${arg}`);
    process.exit(1);
  }
  let allOk = true;
  for (const f of files) {
    const spec = await parseDesignMd(f);
    if (opts.strict) {
      try {
        assertValidDesignSpec(spec);
        ok(`✓ ${spec.id} valid`);
      } catch (e) {
        allOk = false;
        if (e instanceof SpecValidationError) for (const l of e.errors) ok(`✗ ${spec.id} ${l.path}: ${l.message}`);
        else ok(`✗ ${spec.id} ${String((e as Error).message)}`);
      }
    } else {
      const r = formatValidationReport(spec);
      allOk = allOk && r.ok;
      for (const l of r.lines) ok(l);
      for (const w of spec.warnings) ok(`  ! warning: ${w}`);
    }
  }
  if (!allOk) process.exit(2);
}

// ---- inspect ----
async function cmdInspect(id: string) {
  const b = await resolveBrandOrFile(id);
  ok(`\n${b.name}  (${b.id})`);
  ok(`  ${b.description}\n`);
  ok("  Colors:");
  for (const [k, v] of Object.entries(b.colors)) ok(`    ${k.padEnd(12)} ${v}`);
  ok(`\n  Radius: ${b.radius}`);
  ok(`  Type:   heading=${b.typography.heading}  body=${b.typography.body}  base=${b.typography.baseSize}px\n`);
  ok("  Swatches:");
  for (const [k, v] of Object.entries(b.colors)) {
    ok(`    \x1b[48;5;${ansi256(v)}m   \x1b[0m ${k}: ${v}`);
  }
  ok("");
}

// rough hex -> 256-color index for terminal block swatches
function ansi256(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const to6 = (c: number) => Math.round((c * 5) / 255);
  return 16 + to6(r) * 36 + to6(g) * 6 + to6(b);
}

// ---- export ----
async function cmdExport(id: string, opts: { target: string; framework: "nextjs" | "vite"; force?: boolean }) {
  const b = await resolveBrandOrFile(id);
  // Per-spec synthesis: prefer the full DesignSpec (from a .md path, or the
  // baked spec registry for ingested brands) so components reflect the brand's
  // real typography/elevation/palette rather than just the theme CSS vars.
  let spec: import("../spec/types.ts").DesignSpec | undefined;
  if (id.endsWith(".md") && fs.existsSync(id) && fs.statSync(id).isFile()) {
    spec = await parseDesignMd(id);
  } else {
    const { specs } = loadAllSpecs();
    spec = specs.find((s) => s.id === b.id);
  }
  const target = path.resolve(opts.target);
  // Guardrail: never clobber an existing, non-empty target without --force.
  if (!opts.force && fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    console.error(`! Target directory is not empty: ${target}`);
    console.error(`  Refusing to overwrite existing files. Use --force to override.`);
    process.exit(1);
  }
  fs.mkdirSync(target, { recursive: true });
  const componentsDir = path.join(target, "components", "ui");
  const stylesDir = path.join(target, "styles");
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.mkdirSync(stylesDir, { recursive: true });

  // theme.css (shadcn vars) + tailwind entry (@theme)
  fs.writeFileSync(path.join(stylesDir, "theme.css"), emitThemeCss(b));
  fs.writeFileSync(path.join(stylesDir, "globals.css"), emitTailwindTheme(b));
  fs.writeFileSync(path.join(stylesDir, "brand.json"), JSON.stringify(b, null, 2));

  // components (generated source from the factory — same strings the unit test checks)
  // The generated source imports the cn helper as "../lib/cn" (valid inside the
  // monorepo). Once exported into components/ui/, the helper lives alongside as
  // ./cn, so rewrite the relative import before writing.
  for (const p of PRIMITIVES) {
    const src = generateComponent(p, spec).replace(/from "(\.\.\/lib\/cn)"/g, 'from "./cn"');
    fs.writeFileSync(path.join(componentsDir, `${p}.tsx`), src);
  }
  // shared cn helper
  fs.copyFileSync(
    path.join(__dirname, "..", "lib", "cn.ts"),
    path.join(componentsDir, "cn.ts"),
  );

  // framework scaffold
  if (opts.framework === "nextjs") {
    writeNextScaffold(target, b);
  } else {
    writeViteScaffold(target, b);
  }

  ok(`Exported "${b.name}" (${opts.framework}) to ${target}`);
  ok(`  styles/theme.css + globals.css  (shadcn CSS vars, dark mode)`);
  ok(`  components/ui/*.tsx            (${PRIMITIVES.join(", ")})`);
  ok(`  framework entry injected — run: cd ${target} && npm i && npm run dev`);
}

function writeViteScaffold(target: string, b: BrandTokens) {
  fs.writeFileSync(
    path.join(target, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>${b.name}</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`,
  );
  const src = path.join(target, "src");
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(
    path.join(src, "main.tsx"),
    `import React from "react";
import { createRoot } from "react-dom/client";
import "../styles/globals.css";
import "../styles/theme.css";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="min-h-screen bg-background text-foreground p-10">
      <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>${b.name}</h1>
      <Card className="p-5 max-w-md space-y-3">
        <Input placeholder="Try me" />
        <div className="flex gap-2"><Button>Primary</Button><Button variant="outline">Outline</Button></div>
      </Card>
    </div>
  </React.StrictMode>,
);
`,
  );
  fs.writeFileSync(
    path.join(target, "package.json"),
    JSON.stringify(
      {
        name: `df-${b.id}`,
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build" },
        dependencies: {
          "@radix-ui/react-dialog": "^1.1.4",
          "@radix-ui/react-slot": "^1.1.1",
          "clsx": "^2.1.1",
          "react": "^18.3.1",
          "react-dom": "^18.3.1",
          "tailwind-merge": "^2.6.0",
        },
        devDependencies: {
          "@tailwindcss/vite": "^4.0.0",
          "@vitejs/plugin-react": "^4.3.4",
          "tailwindcss": "^4.0.0",
          "vite": "^6.0.5",
        },
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(target, "vite.config.ts"),
    `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({ plugins: [react(), tailwindcss()] });
`,
  );
}

function writeNextScaffold(target: string, b: BrandTokens) {
  const app = path.join(target, "app");
  fs.mkdirSync(app, { recursive: true });
  fs.writeFileSync(path.join(app, "layout.tsx"), `import "../styles/globals.css";\nimport "../styles/theme.css";\nexport default function Root({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body className="bg-background text-foreground" style={{ fontFamily: "var(--font-body)" }}>{children}</body>\n    </html>\n  );\n}\n`);
  fs.writeFileSync(
    path.join(app, "page.tsx"),
    `import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
export default function Page() {
  return (
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>${b.name}</h1>
      <Card className="p-5 max-w-md space-y-3">
        <Input placeholder="Try me" />
        <div className="flex gap-2"><Button>Primary</Button><Button variant="outline">Outline</Button></div>
      </Card>
    </main>
  );
}
`,
  );
  fs.writeFileSync(
    path.join(target, "package.json"),
    JSON.stringify(
      {
        name: `df-${b.id}`,
        private: true,
        scripts: { dev: "next dev", build: "next build" },
        dependencies: {
          "@radix-ui/react-dialog": "^1.1.4",
          "@radix-ui/react-slot": "^1.1.1",
          "clsx": "^2.1.1",
          "next": "^15.1.0",
          "react": "^18.3.1",
          "react-dom": "^18.3.1",
          "tailwind-merge": "^2.6.0",
        },
        devDependencies: {
          "@tailwindcss/postcss": "^4.0.0",
          "tailwindcss": "^4.0.0",
        },
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(target, "postcss.config.mjs"),
    `export default { plugins: { "@tailwindcss/postcss": {} } };\n`,
  );
  fs.writeFileSync(
    path.join(target, "next.config.mjs"),
    `export default {};\n`,
  );
}

// ---- preview ----
async function cmdPreview(id?: string) {
  const brand = id ? resolveBrand(id).id : "aurora";
  ok(`Launching preview showroom for brand "${brand}"...`);
  ok(`  Open: http://localhost:5180/?brand=${brand}`);
  ok(`  (run: pnpm preview -- --brand=${brand}   or just: pnpm preview)`);
  // Best-effort: spawn the vite dev server for the preview workspace.
  const { spawn } = await import("node:child_process");
  const child = spawn(
    process.execPath,
    [
      path.join(__dirname, "..", "..", "node_modules", "tsx", "dist", "cli.mjs"),
      path.join(__dirname, "..", "..", "node_modules", "vite", "bin", "vite.js"),
      "--port",
      "5180",
    ],
    { cwd: path.join(__dirname, "..", ".."), stdio: "inherit" },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}

const program = new Command();
program
  .name("design-forge")
  .description(
    "Generate shadcn themes + brand-themed UI primitives from brand DESIGN.md specs.\n\n" +
      "Flows: list | inspect | export | validate | preview | ingest.\n" +
      "Every command accepts a brand id OR a path to a DESIGN.md spec file.",
  )
  .version("1.1.0");

program.command("list").description("List all brands (built-in + ingested DESIGN.md specs)").action(cmdList);

program
  .command("validate")
  .argument("<brand-or-dir>", "brand id, path to a DESIGN.md spec, or a directory of specs")
  .option("--strict", "fail fast with precise errors (exit 2) instead of reporting warnings")
  .description("Validate brand specs (strict schema, colors, contrast, radius)")
  .action((arg: string, opts: { strict?: boolean }) => {
    Promise.resolve(cmdValidate(arg, opts)).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  });

program
  .command("inspect")
  .argument("<brand>", "brand id OR path to a DESIGN.md spec file")
  .description("Show terminal swatches + typography for a brand (id or .md file)")
  .action((id: string) => {
    Promise.resolve(cmdInspect(id)).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  });

program
  .command("export")
  .argument("<brand>", "brand id OR path to a DESIGN.md spec file")
  .requiredOption("--target <dir>", "output directory")
  .option("--framework <fw>", "vite | nextjs", "vite")
  .option("--force", "overwrite an existing, non-empty target directory")
  .option("--validate", "validate the spec first and abort on strict errors")
  .description("Inject theme + components into a real project (brand id OR .md spec path)")
  .action((id: string, opts: { target: string; framework: "vite" | "nextjs"; force?: boolean; validate?: boolean }) => {
    Promise.resolve(
      (async () => {
        if (opts.validate && id.endsWith(".md") && fs.existsSync(id)) {
          const spec = await parseDesignMd(id);
          assertValidDesignSpec(spec); // throws SpecValidationError -> caught below
        }
        await cmdExport(id, opts);
      })(),
    ).catch((e) => {
      if (e instanceof SpecValidationError) {
        console.error(`! Validation failed:\n${e.message}`);
        process.exit(2);
      }
      console.error(e);
      process.exit(1);
    });
  });

program
  .command("preview")
  .argument("[brand]", "brand id (default aurora)")
  .description("Launch the local showroom")
  .action((id?: string) => {
    Promise.resolve(cmdPreview(id)).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  });

program
  .command("ingest")
  .argument("<dir>", "directory of DESIGN.md specs (recursive)")
  .option("--validate", "validate each spec and report failures after baking")
  .description("Ingest DESIGN.md brand specs into the brand registry and report")
  .action(async (dir: string, opts: { validate?: boolean }) => {
    const abs = path.resolve(dir);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      console.error(`! Spec directory not found: ${abs}`);
      console.error(`  Run \`design-forge ingest design-md\` from the repo root.`);
      process.exit(1);
    }
    const outFile = path.join(__dirname, "..", "brands", "ingested.ts");
    const { brands, files, warnings } = await ingestAndWrite(abs, outFile);
    ok(`Scanned ${files} .md files in ${abs}`);
    ok(`Parsed ${brands.length} brand(s); baked -> ${outFile}`);
    for (const b of brands) {
      ok(`  • ${b.id.padEnd(13)} ${b.name.padEnd(16)} radius=${b.radius} type=${b.typography.heading}/${b.typography.body}`);
    }
    if (warnings.length) {
      ok("\nWarnings:");
      for (const w of warnings) ok(`  ! ${w}`);
    } else {
      ok("\nNo warnings.");
    }
    if (opts.validate) {
      ok("\nValidation:");
      let bad = 0;
      for (const f of await discoverBrandFiles(abs)) {
        const spec = await parseDesignMd(f);
        const r = formatValidationReport(spec);
        for (const l of r.lines) ok(`  ${l}`);
        if (!r.ok) bad++;
      }
      if (bad) {
        console.error(`! ${bad} spec(s) failed validation`);
        process.exit(2);
      }
    }
  });

// Default command: when invoked with no subcommand, list brands (sensible default).
if (process.argv.length <= 2) {
  cmdList();
}

program.parse();
