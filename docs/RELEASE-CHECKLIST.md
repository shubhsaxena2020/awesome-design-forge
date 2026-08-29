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
- [ ] Environment-blocked (no network for the upstream Studio + browser libs).
      Keep the `design-md` corpus import as the offline equivalent and note the
      limitation; revisit only on a networked host.
