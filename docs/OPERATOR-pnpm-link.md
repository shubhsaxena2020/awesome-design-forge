# Operator runbook: `pnpm link --global` (issue #3)

**Status: HUMAN-GATED.** This operation requires a human to authorize and run it.
Automation (the design-forge agent) will NOT execute `pnpm link --global` on its own.

## What it does
Installs the `design-forge` CLI globally so `design-forge` is callable from any
terminal (instead of `pnpm exec tsx src/cli/index.ts ...`). The repo already
exposes it via `package.json` `bin` + the `pnpm link` script.

## Prerequisites (verify before running)
- Node 18+ and pnpm 9+ installed and on `PATH`.
- You are in the repo root: `cd /home/ubuntu/projects/awesome-design-forge`.
- The package builds/runs: `pnpm typecheck && pnpm test` are green.
- You have authority to write into the global pnpm/bin store (your user prefix;
  usually `~/.local/share/pnpm` — no `sudo` needed for a user-level link).

## Run it (the exact command)
```bash
cd /home/ubuntu/projects/awesome-design-forge
pnpm link --global
```

## Verify it worked
```bash
# resolves the global bin
which design-forge
# should print a path under your pnpm global bin dir

# exercise it
design-forge list
design-forge inspect linear-dark
```

## Revert (if needed)
```bash
pnpm unlink --global
# or
pnpm link --global --help
```

## Notes / gotchas
- `pnpm link --global` links the *current* checkout. After `git pull` / a release,
  re-run `pnpm link --global` to refresh the global symlink.
- If `design-forge` is not on `PATH` after linking, add your pnpm global bin dir
  to `PATH` (e.g. `export PATH="$(pnpm root -g)/../../bin:$PATH"` or the dir printed
  by `pnpm bin -g`).
- This is explicitly OUT of scope for automation per issue #3. Only a human runs it.
- The repository tracks the script (`"link": "pnpm link --global"`) but does not
  invoke it.
