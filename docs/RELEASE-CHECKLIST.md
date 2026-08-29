# Release Checklist (roadmap #12)

Run before cutting a release. Every item is verifiable offline unless noted.

## Pre-flight (all offline)
- [ ] `pnpm install --frozen-lockfile` is clean
- [ ] `pnpm gen:brands` re-baked `src/brands/ingested.ts` + `ingested-specs.ts`
      (corpus count matches `find design-md -name '*.md' | wc -l`)
- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm test` → all green (currently 409 tests)
- [ ] `design-forge ready` → passes (version, license, repository, build script)
- [ ] `pnpm build:preview` → produces a styled bundle (bg-primary etc. present)

## Spec / adapter sanity
- [ ] New brand specs pass `design-forge validate <file> --strict`
- [ ] New adapters have a fixture in `src/adapters/__tests__/` and output is
      JSON-stable (adapter(sameInput) === adapter(sameInput))

## Docs
- [ ] `docs/END-TO-END.md` still matches the CLI surface (`design-forge --help`)
- [ ] New commands/flags documented there

## Tagging + publish
- [ ] Bump `version` in `package.json` to the release number
- [ ] Branch: `feat/design-forge-vX.Y` → PR into `feat/design-forge-v1` → merge
- [ ] Fast-forward `feat/design-forge-v1` into `main` via a PR (so `main` reflects
      the work through a real PR, not a direct push)
- [ ] `git tag -a vX.Y.0-design-forge -m "..."` at the merged `main` SHA
- [ ] `git push --tags`
- [ ] `gh release create vX.Y.0-design-forge --title "..." --notes "$(cat <<'EOF' ... EOF)"`

## Visual regression (needs network — capable host / CI `visual` job only)
- [ ] `pnpm exec playwright install --with-deps chromium`
- [ ] `pnpm test:visual` → baselines seeded + diff clean
- [ ] Do NOT claim this step passed on the offline build VPS (it is environment-
      blocked there: missing `libnss3`/`libdbus`/`libxkbcommon`/`libgbm`/`libasound`,
      no root/network). Document it as blocked, never as faked.

## Kinetic Studio

**What it is:** Kinetic Studio is the upstream design-token *studio* that can
export brand token sets to DESIGN.md. In an ideal flow you'd point it at a live
Kinetic workspace and pull specs straight into `design-md/` for ingestion.

**Why it is blocked here (offline build VPS):**
- No network to reach the upstream Kinetic Studio API/workspace.
- Even if specs were fetched, the visual-regression browser (`chromium`) cannot
  launch here (missing `libnss3`/`libdbus`/`libxkbcommon`/`libgbm`/`libasound`),
  so there is no way to close the loop and screenshot the result.
- `pnpm link --global` (issue #3) is also human-gated and not run by automation.

**Offline equivalent (already done):** the `design-md/` corpus import IS the
offline stand-in. Issue #2 shipped a clean 84-brand bake (76 `DESIGN.md` + 1
`starter.md` + 8 loose specs) via `pnpm gen:brands` / `design-forge ingest`, with
the `isBrandSpec` gate dropping phantom README/prose files. That covers the
"import a brand set" goal without Kinetic Studio.

**When to revisit:** only on a networked host with browser system libs (e.g. the
CI `visual` runner). Then: authenticate Kinetic Studio, export the workspace to
`design-md/`, re-bake, and run `pnpm test:visual` to seed baselines. Until then,
keep the corpus import as the source of truth and do not claim a Kinetic import
succeeded.

