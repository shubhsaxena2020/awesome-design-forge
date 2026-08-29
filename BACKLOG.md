# awesome-design-forge — Next Backlog (autonomous work program)

Status: v1.6.0-design-forge shipped (409/409 tests green; 84-source DESIGN.md corpus ingested,
issue #2 closed). Human-gated: **#3** (pnpm link --global needs human authorization) and the
Playwright visual baseline re-seed needs a networked host (missing browser libs on this VPS).
Do NOT run `pnpm link --global`. Work via branch -> PR -> squash-merge -> tag -> release.

## Phase A — Docs hygiene (the agent's own suggestion)
1. [ ] Move SMALL-SCREEN/UX docs (if present in repo root) into a `docs/` folder and commit. **done when**
   docs/ contains them and root is clean.
2. [ ] Write a `docs/CORPUS.md` listing the 84 ingested brand specs and how to extend the set. **done when**
   CORPUS.md present.
3. [ ] Reconcile the 84-source set vs the issue's "74-source" count; document the delta. **done when** delta
   documented (no transfer needed unless asked).

## Phase B — Coverage & robustness
4. [ ] Cover the 1 remaining TODO/FIXME in src (locate via grep) with a test or remove it. **done when**
   zero TODO/FIXME in src.
5. [ ] Add tests for brand adapters/shims (#5) negative paths (unknown brand). **done when** negative tests green.
6. [ ] Add a test that an invalid DESIGN.md fails validation gracefully. **done when** validation test green.
7. [ ] Increase coverage on the token-diff engine (v1.3.0 feature). **done when** token-diff covered.
8. [ ] Add a test for the showroom render with a minimal brand. **done when** showroom smoke test green.
9. [ ] Add a test for the cache layer (v1.1.0) invalidation. **done when** cache tested.

## Phase C — Developer experience
10. [ ] Add a `pnpm run lint` if missing; ensure CI runs it. **done when** lint in CI.
11. [ ] Document the CLI command surface in README with examples. **done when** CLI documented.
12. [ ] Add a contribution guide mirroring the PR-based workflow. **done when** CONTRIBUTING present.
13. [ ] Add a `docs/RELEASE-CHECKLIST.md` from RELEASE-CHECKLIST references. **done when** checklist committed.

## Phase D — Stretch (honest about environment limits)
14. [ ] Add a Playwright test that SKIPS when browser libs are absent (so CI stays green here) and runs on a
    capable host. **done when** test skips cleanly locally, runs remotely.
15. [ ] Document the Kinetic Studio import limitation in RELEASE-CHECKLIST.md. **done when** limitation noted.
16. [ ] Benchmark ingest time for the full 84-source corpus. **done when** benchmark note exists.
17. [ ] Add a seed-subset regeneration script for replays. **done when** script present.
18. [ ] Propose (do not execute) the `pnpm link --global` step as a ready-to-run operator command for #3.
    **done when** a documented command exists for the human to run.
