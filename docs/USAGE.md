# design-forge — Usage Guide

`design-forge` turns [DESIGN.md](https://github.com/Design-MD/design-md) brand
specifications into typed **Tailwind CSS v4 themes**, **shadcn/Radix component
packages**, and an **interactive preview showroom**. This guide shows the common
workflows.

## 0. Install

```bash
cd awesome-design-forge
pnpm install
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest (req 6 + req 7 guarantees)
pnpm test:visual    # playwright: boots preview, req 8 + req 9 screenshots
```

## 1. Add / ingest brand specs

Brand specs live as `*.md` files in `design-md/` (recursive). Each file's YAML
front matter is parsed into a `BrandTokens` model:

```md
---
version: alpha
name: MyBrand
description: One-sentence description of the visual identity.
colors:
  primary: "#1A1C1E"          # core text / high-emphasis text
  secondary: "#6C7278"
  tertiary: "#B8422E"         # interaction driver (-> shadcn --primary)
  neutral: "#F7F5F2"          # page background
  on-tertiary: "#F7F5F2"
typography:
  h1:   { fontFamily: "Public Sans", fontSize: 3.5rem, fontWeight: 700 }
  body-md: { fontFamily: "Public Sans", fontSize: 1.0625rem, lineHeight: 1.6 }
rounded:
  sm: 4px
  md: 8px
  lg: 16px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
---
```

> **Note on semantics** — the canonical DESIGN.md format treats `primary` as
> *core text* and `tertiary` as the *interaction/action* color. `design-forge`
> maps `tertiary → --primary` (shadcn action) and `primary → --foreground`
> (readable text on the background). Missing `on-*` keys are inferred via WCAG
> contrast; missing typography/radius fall back to Inter / 0.5rem.

After adding or editing specs, re-bake the registry:

```bash
pnpm gen:brands                       # re-ingest design-md/ -> src/brands/ingested.ts
# or, pointing at any directory:
design-forge ingest /path/to/design-md
```

`ingested.ts` is the committed, browser-safe artifact the preview and CLI read
from — **never edit it by hand**.

## 2. Inspect what you have

```bash
design-forge list                 # built-in + ingested brands
design-forge inspect linear-dark   # colors, radius, typography, terminal swatches
```

## 3. Preview in the showroom

```bash
pnpm preview                      # http://localhost:5180/?brand=aurora
design-forge preview coral-pop    # open a specific brand
```

Every brand (built-in **and** ingested) loads via `?brand=<id>`, with a live
light/dark toggle and an interactive UI kit.

## 4. Export into a real project

```bash
# Vite + React SPA
design-forge export linear-dark --target ./apps/web --framework vite

# Next.js (App Router)
design-forge export heritage --target ./apps/marketing --framework nextjs
```

Each export writes:

```
styles/theme.css        # shadcn CSS vars (:root + .dark, oklch)
styles/globals.css     # Tailwind @theme entry
styles/brand.json       # the resolved BrandTokens (for tooling)
components/ui/*.tsx      # button, card, input, modal, navbar (brand-themed)
components/ui/cn.ts     # clsx + tailwind-merge helper
<framework scaffold>     # main.tsx / page.tsx wired to the theme
```

The exported components consume the **same** generated CSS variables as the
preview, so *what you preview is what you ship*. Verify with:

```bash
cd ./apps/web && npm install && npm run build   # clean build
```

## 5. Programmatic API

```ts
import { ingestDir, loadAllBrands } from "awesome-design-forge/src/brands/ingest";
import { emitThemeCss, emitTailwindTheme } from "awesome-design-forge/src/generators/css-variables";
import { generateComponent, PRIMITIVES } from "awesome-design-forge/src/generators/component-factory";

const { brands } = ingestDir("design-md");
for (const b of brands) {
  const css = emitThemeCss(b);                 // -> shadcn :root + .dark
  const tw  = emitTailwindTheme(b);            // -> Tailwind @theme
  for (const p of PRIMITIVES) {
    const tsx = generateComponent(p);          // -> brand-themed component source
  }
}
```

## 6. The 74-spec corpus

Drop all 74 brand specs into `design-md/` (or any directory) and run:

```bash
design-forge ingest /path/to/awesome-design-md/design-md
pnpm test:visual     # regenerates 28+ baseline screenshots (all brands)
```

Every spec flows through the identical generator → preview → export pipeline,
regardless of whether it was hand-authored or ingested.
