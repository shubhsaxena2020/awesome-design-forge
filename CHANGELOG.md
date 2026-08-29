# Changelog

## [1.9.0] - 2026-08-29 (design-forge)

### DX / CI (Backlog Phase C)
- **Added `pnpm lint`** (Backlog C10): ESLint 9 flat config (`eslint.config.js`)
  with `typescript-eslint` recommended rules. `no-explicit-any` and
  `no-non-null-assertion` are warnings (non-blocking); `no-debugger` is an error.
  Generated artifacts (`src/brands/ingested*.ts`) are ignored.
- **CI**: new `lint` job runs `pnpm lint` on `ubuntu-latest` (node 22) alongside
  the existing `test` matrix and `visual` job.
- `pnpm-lock.yaml` updated for the new dev dependencies.

### Also in Phase C
- C11 (README CLI command surface) and C12 (CONTRIBUTING.md) were delivered in
  Phase A; C13 (`docs/RELEASE-CHECKLIST.md`) already existed.

### Verification (offline)
- `pnpm lint` → 0 errors (13 pre-existing warnings, non-blocking).
- `pnpm typecheck` clean; `pnpm test` → 289 passed.



### Tests / robustness (Backlog Phase B)
- **`src/adapters/__tests__/adapters-negative.test.ts`** (B5): brand adapters/shims
  stay safe under hostile/empty input, their output always passes the strict
  validator, and `getBrand(<unknown>)` throws a clear `Unknown brand` error that
  lists known brands.
- **`src/parser/__tests__/invalid-spec.test.ts`** (B6): malformed YAML / invalid
  colors / invalid radius are reported by `validateDesignSpec` (pure, non-
  mutating); broken prose still yields a best-effort spec + warning, never a crash.
- **`src/transformers/__tests__/token-diff.test.ts`** (B7): added/removed/changed/
  unchanged classification, flatten helpers, `summarizeDiff`, `formatDiff({onlyChanged})`.
- **`src/showroom/__tests__/showroom-smoke.test.ts`** (B8): renders the real
  `<Showroom>` via `react-dom/server` for a built-in, an ingested brand
  (`linear-dark`, token refs), and the DiffView — no browser required.
- **`src/parser/__tests__/cache-invalidation.test.ts`** (B9): mtime+size
  invalidation, reference-identical cache hits, `clearSpecCache` reset.
- `packages/preview/src/Showroom.tsx`: removed an unused `formatDiff` import
  (pre-existing `tsc` error under `noUnusedLocals` that would have failed CI).

### Verification (offline)
- `pnpm typecheck` clean; `pnpm test` → **289 passed** (was 267; +22 Phase B tests).



### Docs / hygiene (Backlog Phase A)
- **`docs/CORPUS.md`** (new): full 84-brand inventory (71 front-matter, 13
  prose/best-effort, 2 seed), with source-shape caveats and an "extend the set"
  walkthrough.
- **`docs/CORPUS.md`** documents the **84 vs the issue's "74-source" count** delta
  (+10): the local `design-md/` carries more sources than the original Windows 74
  set. Not a defect; no transfer performed.
- **`CONTRIBUTING.md`** (new): the required branch -> PR -> squash-merge -> tag ->
  release workflow, plus human-gated operations (#3, visual-reseed).
- **README.md**: full CLI command surface (`list`/`inspect`/`validate`/`export`/
  `preview`/`ingest`/`adapter`/`diff`/`ready`) with verified examples.
- **`src/__tests__/no-todo.test.ts`** (new guard): fails if any `TODO`/`FIXME` is
  reintroduced in `src/` (closes the last open source-hygiene item).
- `docs/RELEASE-CHECKLIST.md` already present (Phase C13 — verified, no-op).

### Notes
- A1 (move SMALL-SCREEN/UX docs) was N/A — no such docs exist in repo root.

## [1.6.0] - 2026-08-29 (design-forge)

### Added
- **Full-corpus ingest (issue #2):** the ingester now bakes a clean **84-brand**
  registry from the entire `design-md/` corpus (76 `DESIGN.md` + `starter.md` +
  8 loose specs) instead of 157 brands where 73 were phantom
  `readme-md`/`Unknown`/`design-md-N` artifacts.

### Fixed
- `isBrandSpec()` gate (`src/parser/design-parser.ts`): a `.md` is treated as a
  real spec only if it has front matter (`name`/`colors`/`typography`) **or** a
  brand-related prose heading, and is **not** a placeholder that defers to an
  external site (`getdesign.md`). Previously the ingester walked every `.md`, so
  73 placeholder `README.md` docs baked into phantom brands that polluted the
  showroom + export.
- `fallbackSpec()`: genuine-but-non-front-matter brand docs (e.g. Kraken /
  Spotify prose analyses, YAML-broken elevenlabs) now ingest as best-effort
  neutral brands with a documented, non-fatal warning — no longer dropped or
  ghosted into `design-md-N`.
- Gate wired into all three ingest paths (`ingestDir`, `ingestDirSpecs`,
  `ingestDirDesignSpecs`); baked registry regenerated.

### Tests
- `src/parser/__tests__/is-brand-spec.test.ts` locks the gate behavior.

### Notes
- Visual regression (`pnpm test:visual`) remains environment-blocked on the
  build VPS (missing browser system libs — `libglib-2.0.so.0`); it runs on the
  networked CI `visual` job. Not faked.

- **DESIGN.md ingester** (`src/brands/ingest.ts`): recursively parses
  `*.md` brand specs (YAML front matter) into the internal `BrandTokens`
  model, resolving `{token}` references, inferring missing foregrounds via
  WCAG contrast, and applying graceful fallbacks for partial specs.
- **Baked registry** (`src/brands/ingested.ts`): a browser-safe, fs-free
  artifact generated by `pnpm gen:brands` / `design-forge ingest <dir>` so
  the Vite preview can resolve ingested brands without `node:fs`.
- **Phase B generators**
  - `css-variables.ts` (req 6): `emitThemeCss` maps brand tokens to the
    standard shadcn CSS custom properties as `oklch()` triples with a `.dark`
    override; `emitTailwindTheme` exposes them to Tailwind.
  - `component-factory.ts` (req 7): synthesizes brand-themed React primitives
    (button, card, input, modal, navbar). Every component is checked by
    `assertNoLayoutThrashing()` — no width/height/top/left/margin/padding
    animation.
- **Phase C preview** (`packages/preview/`)
  - `req 8`: Vite showroom loading any brand via `?brand=<id>`, with
    typography specimens, palette swatches, an interactive UI kit, and a
    light/dark toggle.
  - `req 9`: Playwright visual-regression for all brands (light + dark) →
    28 baseline screenshots.
- **Phase D CLI** (`src/cli/index.ts`, bin `design-forge`)
  - `req 10`: `list`, `inspect <brand>`, `export <brand> --target <dir>
    --framework <vite|nextjs>`, `preview <brand>`, and `ingest <dir>`.
- **Verification**
  - 36 unit tests (vitest) covering req 6, req 7, and the ingester (canonical
    semantics + graceful degradation on non-spec files).
  - 28 Playwright tests (req 8 + req 9).
  - Ingested-brand export + `vite build` smoke test (req 12).

### Notes
- 6 built-in reference brands ship in `src/brands/tokens.ts`; everything in
  `design-md/` is merged on top (ingested ids win on collision).
- `src/brands/ingested.ts` is auto-generated — do not edit by hand.
