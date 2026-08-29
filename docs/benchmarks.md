# Benchmarks

Real, offline measurements (run on the build VPS). Re-run any time with
`pnpm bench:ingest`.

## Ingest time — full 84-source corpus

Measured by `scripts/bench-ingest.ts`, which times the same
`ingestDirSpecs(design-md/)` call that `pnpm gen:brands` uses to re-bake
`src/brands/ingested.ts` + `ingested-specs.ts`.

| Operation | Input | Wall-clock |
|-----------|-------|------------|
| ingest | 84 specs / 157 `.md` files (84 walked) | **~291 ms** |

That is ~3.5 specs/sec on this host — dominated by per-file `fs` reads +
js-yaml parse + the `isBrandSpec` gate. Re-baking the entire registry is a
sub-second operation, so `pnpm gen:brands` is cheap to run after any spec edit.

### How to reproduce
```bash
pnpm bench:ingest
# -> | ingest (84 specs / 157 .md files, 84 walked) | 291.2 ms | 84 brands baked |
```

> Numbers vary with disk/cache warmth; treat the order of magnitude (~hundreds of
> ms for the full corpus), not the exact figure, as the contract.
