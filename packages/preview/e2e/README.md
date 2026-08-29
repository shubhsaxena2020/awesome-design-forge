# Visual-regression suite (Playwright)

`visual.spec.ts` loads the interactive preview showroom (`packages/preview`)
for **every baked brand** (`?brand=<id>`), waits for the per-brand theme to be
injected, and asserts a baseline screenshot so future theme changes are caught
as pixel diffs.

## Run it (requires a browser-capable host)

```bash
pnpm exec playwright install chromium   # one-time; needs network
pnpm test:visual                         # starts the showroom (webServer) + screenshots
```

First run seeds baselines (passes). Later runs diff against them.

## Why it is NOT executed on the build VPS

The CI/build host (this VPS) lacks chromium's required system shared
libraries (`libnss3`, `libdbus-1`, `libxkbcommon`, `libgbm`, `libasound`, …)
and there is no root/network to install them (`playwright install-deps` needs
apt + sudo). The cached `chromium_headless_shell` binary fails at launch with:

```
error while loading shared libraries: libglib-2.0.so.0: cannot open shared object file
```

So the pixel-diff run is **authored but unverified here**. It is fully turnkey
on any host that has chromium + its system deps (e.g. a GitHub Actions runner
with `playwright install --with-deps`). The offline-verified stand-ins for this
suite are:

- `src/brands/__tests__/ingested-preview.test.ts` — every baked brand round-trips
  to a valid `:root` + `.dark` shadcn theme.
- `src/generators/__tests__/component-synthesis.test.ts` — all 155 specs
  synthesize to non-layout-thrashing components embedding per-spec fonts/tracking.
- `vite build` of `packages/preview` produces a ~17KB stylesheet with the
  `bg-primary` / `text-foreground` / `rounded` / `font-medium` utilities, proving
  the showroom renders styled output (the precondition for meaningful screenshots).
