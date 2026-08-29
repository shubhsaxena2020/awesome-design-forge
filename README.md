# awesome-design-forge

A **deterministic brand-spec compiler + CLI**. It ingests any [DESIGN.md](https://github.com/Design-MD/design-md) brand specification, synthesizes a typed **Tailwind CSS v4 theme + shadcn/Radix component package**, and renders an **interactive visual preview** — eliminating manual translation of brand markdown specs into working code.

Stack: TypeScript · React 18 · Vite 6 · Tailwind CSS v4 (`@tailwindcss/vite`) · Radix UI · Commander · js-yaml · Vitest · Playwright.

## What it does

- **DESIGN.md ingester** (`src/brands/ingest.ts`)
  - Recursively scans a directory of `*.md` specs (the 74-spec corpus lives in `design-md/`), parses YAML front matter, and maps `colors` / `typography` / `rounded` / `spacing` / `components` onto the internal `BrandTokens` model.
  - Resolves `{colors.primary}`-style token references, infers missing foregrounds (WCAG luminance), applies sensible fallbacks for partial specs, and emits per-file warnings.
  - Bakes the result into a browser-safe `src/brands/ingested.ts` module (`pnpm gen:brands`) so the Vite preview resolves ingested brands **without `node:fs`**.
  - 6 built-in reference brands ship in `src/brands/tokens.ts`; everything in `design-md/` is merged on top (ingested ids win on collision).
- **Phase B — generators**
  - `src/generators/css-variables.ts` (req 6): maps brand tokens to the standard shadcn CSS custom properties (`--background`, `--foreground`, `--card`, `--primary`, `--border`, `--radius`, …) as `oklch()` triples, with a `.dark` override. `emitTailwindTheme()` exposes them to Tailwind utilities.
  - `src/generators/component-factory.ts` (req 7): synthesizes brand-themed React primitives (button, card, input, modal, navbar) that consume those vars. Every emitted component is checked by `assertNoLayoutThrashing()` — transitions are restricted to compositor-friendly properties (transform, opacity, color, box-shadow, filter); **no** `width`/`height`/`top`/`left`/`margin`/`padding` animation.
- **Phase C — interactive preview** (`packages/preview/`)
  - `req 8`: a Vite showroom that dynamically loads any brand (built-in **or** ingested) via `?brand=<id>`, shows typography specimens, color palettes, an interactive UI kit (buttons/inputs/cards/modal/navbar), and a light/dark toggle. Boots in ~300ms; renders with no runtime errors.
  - `req 9`: Playwright headless visual-regression for **all** brands (light + dark) → 28 baseline screenshots in `e2e/__screenshots__/`.
- **Phase D — CLI** (`src/cli/index.ts`, bin `design-forge`)
  - `req 10`: `list`, `inspect <brand>`, `export <brand> --target <dir> --framework <vite|nextjs>`, `preview <brand>`, and `ingest <dir>` (re-bakes `ingested.ts`).

## Commands

```bash
pnpm install
pnpm typecheck             # tsc --noEmit
pnpm test                 # vitest: req 6 + req 7 guarantees
pnpm test:visual          # playwright: boots preview, req 8 + req 9 screenshots
pnpm preview              # launch the showroom at http://localhost:5180/?brand=aurora
pnpm gen:brands           # re-ingest design-md/ -> src/brands/ingested.ts

# CLI
design-forge list
design-forge inspect aurora
design-forge ingest design-md      # re-bake the ingested-brand registry
design-forge export aurora --target ./out --framework vite
design-forge export ember  --target ./out --framework nextjs
design-forge preview coral
```

> Full worked examples (front-matter shape, export layout, programmatic API, the 74-spec corpus) are in **[docs/USAGE.md](docs/USAGE.md)**.

### Ingesting the 74-spec corpus

Drop the brand specs into `design-md/` (or point `ingest` at any directory):

```bash
design-forge ingest /path/to/awesome-design-md/design-md
# -> regenerates src/brands/ingested.ts (committed artifact)
```

Every ingested spec then flows through the same generators, preview, and export pipeline as the built-in brands.

## Architecture / data flow

```
DESIGN.md specs ──▶ ingest.ts ──▶ ingested.ts (baked) ──┐
                                                          ├──▶ BrandTokens ──▶ css-variables.ts ──emitThemeCss──▶ theme.css (:root + .dark oklch vars)
built-in BRANDS ────────────────────────────────────────┘                       │
                                                                                 └─▶ component-factory.ts ──generateComponent──▶ *.tsx

Preview showroom ──▶ loads BrandTokens (built-in ∪ ingested) ──▶ injects theme.css, toggles .dark, renders the UI kit.
CLI export ──▶ writes theme.css + globals.css + components/ui/* + framework scaffold.
```

The preview showroom and the exported components both consume the **same** generated CSS variables, so "what you preview is what you ship."

## Verification status

| Req | Check | Result |
|-----|-------|--------|
| 6 | All 20 shadcn vars present in `:root` and `.dark` for every brand (built-in + ingested); oklch values; dark flips surface | ✅ 33 unit tests |
| 7 | Generated components contain no layout-thrashing animated properties | ✅ guard + 33 unit tests |
| 8 | Preview dev server boots; renders without runtime errors (all 14 brands) | ✅ Playwright (28/28) |
| 9 | Clean baseline screenshots for ≥5 brands | ✅ 28 PNGs (14 brands × light/dark) |
| 10 | CLI `list` / `inspect` / `export` / `preview` / `ingest` end-to-end | ✅ scripted run + build smoke test |
| 12 | Ingested brand (linear-dark, uses `{token}` refs) exports + `vite build` clean | ✅ smoke test |

## Notes / limitations

- Brand fonts are pulled from Google Fonts at preview time; if offline, the showroom falls back to system fonts (theme still applies).
- The generators currently emit the 5 core primitives. Adding more (select, tabs, tooltip) means extending `PRIMITIVES` in `component-factory.ts` and keeping the no-layout-thrash contract.
- `export --framework nextjs` scaffolds an App-Router project; `vite` scaffolds a Vite + React SPA. Both wire `globals.css` + `theme.css` and a small demo page.
- `src/brands/ingested.ts` is auto-generated — do not edit by hand; run `pnpm gen:brands` (or `design-forge ingest <dir>`) after changing specs.
