# DesignForge — End-to-End Examples

One worked example per primary output mode. Each assumes you are at the repo
root and the full brand corpus is baked (`pnpm gen:brands` once, or after
`design-forge ingest design-md`).

> All commands are offline. `design-forge` maps to `pnpm exec tsx src/cli/index.ts`
> (or the linked `design-forge` bin). Every command accepts a **brand id** OR a
> **path to a `DESIGN.md` spec file**.

## 1. Inspect — terminal swatches + typography

```bash
design-forge inspect linear
# or from a spec file:
design-forge inspect design-md/linear/DESIGN.md
```

Shows the resolved palette, radius, typography roles, and ANSI block swatches.

## 2. Validate — fail fast on bad specs

```bash
# report mode (warnings + errors, exit 0 if no hard errors)
design-forge validate design-md --strict

# a single spec, strict (exit 2 on any validation error)
design-forge validate design-md/linear/DESIGN.md --strict
```

`--strict` checks id shape, required + present colors (valid CSS), WCAG-AA
contrast for offline-computable hex pairs, and radius length.

## 3. Export → Vite (working, compilable project)

```bash
design-forge export linear --target ./out/linear --framework vite
cd ./out/linear && npm i && npm run dev
```

Produces `styles/theme.css` (shadcn CSS vars + dark mode), `styles/globals.css`
(Tailwind v4 `@theme`), `components/ui/*.tsx` (button, card, input, modal,
navbar — **per-spec** typography/elevation/variants), a `cn` helper, and a Vite
entry. The output actually compiles via `@tailwindcss/vite` (verified by the
test suite's real offline build).

Abort before emitting a broken theme:

```bash
design-forge export design-md/linear/DESIGN.md --target ./out/linear --validate
```

## 4. Export → Next.js

```bash
design-forge export figma --target ./out/figma --framework nextjs
cd ./out/figma && npm i && npm run dev
```

Same theme/components, but scaffolded as a Next.js `app/` route.

## 5. Preview — live showroom (side-by-side, per brand)

```bash
design-forge preview            # opens http://localhost:5180/?brand=aurora
design-forge preview figma      # ?brand=figma
```

The showroom renders every baked brand side-by-side (input spec · tokens ·
generated UI) and re-skins live via injected theme CSS. See
`packages/preview/e2e/README.md` for the Playwright harness (authored;
requires a browser-capable host).

## 6. Ingest — bake the corpus

```bash
design-forge ingest design-md
# validates every spec and reports failures:
design-forge ingest design-md --validate
```

Writes `src/brands/ingested.ts` (BrandTokens) + `src/brands/ingested-specs.ts`
(DesignSpec[]) consumed by the preview and the per-spec `export` path.

## 7. Ready — publish/packaging check

```bash
design-forge ready                       # checks this repo
design-forge ready --target ./out/linear # checks an exported scaffold
```

Fails (exit 2) if version/license/repository/scripts metadata is missing.

## Notes
- `design-forge` with no subcommand lists all brands (sensible default).
- `export` never overwrites a non-empty target unless you pass `--force`.
- The pipeline is 100% local/offline; no network calls are made.
