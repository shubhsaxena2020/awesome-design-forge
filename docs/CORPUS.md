# design-md Corpus

`design-forge` bakes its brand registry from every real spec under `design-md/` (recursive).
After `pnpm gen:brands` the baked registry in `src/brands/ingested.ts` / `ingested-specs.ts`
contains **84 brands** (6 built-in reference brands in `src/brands/tokens.ts` are merged on top, ingested ids win on collision).

## Composition

| Bucket | Count | Notes |
|--------|-------|-------|
| Front-matter specs (real DESIGN.md) | 71 | Parsed from YAML front matter |
| Prose / best-effort docs | 13 | Genuine brand analyses lacking machine-readable front matter (e.g. Kraken, Spotify); ingested best-effort with a documented warning |
| Seed fixtures | 2 | `seed-noisy`, `seed-sparse` — edge-case specs for the visual-regression suite |

## Caveats (read before trusting the corpus)

- The ingest gate (`isBrandSpec` in `src/parser/design-parser.ts`) excludes non-brand files: placeholder `README.md` docs that defer to an external site, prose with no brand heading, and empty files. If you add a spec, give it front matter (`name`/`colors`/`typography`) or a `# Design System ...` heading, or it will be skipped silently.
- Prose/best-effort brands carry a neutral fallback palette (white bg / blue primary). Their colors are NOT real until the upstream spec is converted to canonical front matter. Treat them as scaffolding.

## Full brand inventory (84)

| # | id | name | source shape |
|---|----|------|-------------|
| 1 | `airbnb-design-analysis` | Airbnb-design-analysis | front-matter |
| 2 | `airtable-design-analysis` | Airtable-design-analysis | front-matter |
| 3 | `apple-design-analysis` | Apple-design-analysis | front-matter |
| 4 | `binance-design-analysis` | Binance-design-analysis | front-matter |
| 5 | `bmw-design-analysis` | BMW-design-analysis | front-matter |
| 6 | `bmw-m-design-analysis` | BMW-M-design-analysis | front-matter |
| 7 | `bugatti-design-analysis` | Bugatti-design-analysis | front-matter |
| 8 | `cal-com-design-analysis` | Cal.com-design-analysis | front-matter |
| 9 | `claude-design-analysis` | Claude-design-analysis | front-matter |
| 10 | `clay-design-analysis` | Clay-design-analysis | front-matter |
| 11 | `clickhouse-design-analysis` | ClickHouse-design-analysis | front-matter |
| 12 | `cohere-design-analysis` | Cohere-design-analysis | front-matter |
| 13 | `coinbase-design-analysis` | Coinbase-design-analysis | front-matter |
| 14 | `composio-design-analysis` | Composio-design-analysis | front-matter |
| 15 | `coral-pop` | Coral Pop | front-matter |
| 16 | `cursor-design-analysis` | Cursor-design-analysis | front-matter |
| 17 | `dell-1996-inspired` | Dell 1996 Inspired | front-matter |
| 18 | `elevenlabs` | Elevenlabs | prose/best-effort |
| 19 | `ember-fintech` | Ember Fintech | front-matter |
| 20 | `expo-design-analysis` | Expo-design-analysis | front-matter |
| 21 | `ferrari-design-analysis` | Ferrari-design-analysis | front-matter |
| 22 | `figma-design-analysis` | Figma-design-analysis | front-matter |
| 23 | `framer-design-analysis` | Framer-design-analysis | front-matter |
| 24 | `hashicorp-design-analysis` | HashiCorp-design-analysis | front-matter |
| 25 | `heritage` | Heritage | front-matter |
| 26 | `hp-design-analysis` | HP-design-analysis | front-matter |
| 27 | `ibm-design-analysis` | IBM-design-analysis | front-matter |
| 28 | `intercom-design-analysis` | Intercom-design-analysis | front-matter |
| 29 | `kraken` | Kraken | prose/best-effort |
| 30 | `lamborghini` | Lamborghini | prose/best-effort |
| 31 | `linear-dark` | Linear Dark | front-matter |
| 32 | `linear-design-analysis` | Linear-design-analysis | front-matter |
| 33 | `lovable` | Lovable | prose/best-effort |
| 34 | `mastercard` | Mastercard | prose/best-effort |
| 35 | `meta-design-analysis` | Meta-design-analysis | front-matter |
| 36 | `minimax-design-analysis` | MiniMax-design-analysis | front-matter |
| 37 | `mintlify-design-analysis` | Mintlify-design-analysis | front-matter |
| 38 | `miro-design-analysis` | Miro-design-analysis | front-matter |
| 39 | `mistral-ai-design-analysis` | Mistral-AI-design-analysis | front-matter |
| 40 | `mongodb-design-analysis` | MongoDB-design-analysis | front-matter |
| 41 | `mono-devtools` | Mono Devtools | front-matter |
| 42 | `mybrand` | MyBrand | front-matter |
| 43 | `nike-design-analysis` | Nike-design-analysis | front-matter |
| 44 | `nimbus` | Nimbus | front-matter |
| 45 | `nintendo-com-2001-analysis` | Nintendo.com (2001) Analysis | front-matter |
| 46 | `notion-design-analysis` | Notion-design-analysis | front-matter |
| 47 | `nvidia-design-analysis` | NVIDIA-design-analysis | front-matter |
| 48 | `ollama-design-analysis` | Ollama-design-analysis | front-matter |
| 49 | `opencode-design-analysis` | OpenCode-design-analysis | front-matter |
| 50 | `pinterest-design-analysis` | Pinterest-design-analysis | front-matter |
| 51 | `playstation-design-analysis` | PlayStation-design-analysis | front-matter |
| 52 | `posthog-design-analysis` | PostHog-design-analysis | front-matter |
| 53 | `raycast` | Raycast | prose/best-effort |
| 54 | `renault-design-analysis` | Renault-design-analysis | front-matter |
| 55 | `replicate-design-analysis` | Replicate-design-analysis | front-matter |
| 56 | `resend-design-analysis` | Resend-design-analysis | front-matter |
| 57 | `revolut-design-analysis` | Revolut-design-analysis | front-matter |
| 58 | `runwayml` | Runwayml | prose/best-effort |
| 59 | `sanity` | Sanity | prose/best-effort |
| 60 | `seed-noisy` | Seed Noisy | front-matter |
| 61 | `seed-sparse` | Seed Sparse | front-matter |
| 62 | `sentri-inspired-design-analysis` | Sentri-Inspired-design-analysis | front-matter |
| 63 | `shopifi-inspired-design-analysis` | Shopifi-Inspired-design-analysis | front-matter |
| 64 | `slacc-inspired-design-analysis` | Slacc-Inspired-design-analysis | front-matter |
| 65 | `spacex-inspired-design-analysis` | Spacex-Inspired-design-analysis | front-matter |
| 66 | `spotify` | Spotify | prose/best-effort |
| 67 | `starbucks` | Starbucks | prose/best-effort |
| 68 | `stripi-inspired-design-analysis` | Stripi-Inspired-design-analysis | front-matter |
| 69 | `supabase` | Supabase | prose/best-effort |
| 70 | `superhumon-inspired-design-analysis` | Superhumon-Inspired-design-analysis | front-matter |
| 71 | `tesla` | Tesla | prose/best-effort |
| 72 | `theverge` | Theverge | prose/best-effort |
| 73 | `together-ai-inspired-design-analysis` | Together-AI-Inspired-design-analysis | front-matter |
| 74 | `uber-inspired-design-analysis` | Uber-Inspired-design-analysis | front-matter |
| 75 | `vercel-inspired-design-analysis` | Vercel-Inspired-design-analysis | front-matter |
| 76 | `verdant-health` | Verdant Health | front-matter |
| 77 | `vodafone-inspired-design-analysis` | Vodafone-Inspired-design-analysis | front-matter |
| 78 | `voltagent-inspired-design-analysis` | Voltagent-Inspired-design-analysis | front-matter |
| 79 | `warp-inspired-design-analysis` | Warp-Inspired-design-analysis | front-matter |
| 80 | `webflow-inspired-design-analysis` | Webflow-Inspired-design-analysis | front-matter |
| 81 | `wired-inspired-design-analysis` | Wired-Inspired-design-analysis | front-matter |
| 82 | `wise-inspired-design-analysis` | Wise-Inspired-design-analysis | front-matter |
| 83 | `xai-inspired-design-analysis` | xAI-Inspired-design-analysis | front-matter |
| 84 | `zapier-inspired-design-analysis` | Zapier-Inspired-design-analysis | front-matter |

## How to extend the set

1. Drop a new spec into `design-md/` (any subfolder):

```md
---
version: alpha
name: MyBrand
description: One-sentence description of the visual identity.
colors:
  primary: "#1A1C1E"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  h1:   { fontFamily: "Public Sans", fontSize: 3.5rem, fontWeight: 700 }
  body-md: { fontFamily: "Public Sans", fontSize: 1.0625rem, lineHeight: 1.6 }
rounded:
  md: 8px
---
```md

2. Re-bake the registry:

```bash
pnpm gen:brands
design-forge ingest /path/to/design-md
```

3. Verify it parses and validates:

```bash
design-forge inspect mybrand
design-forge validate design-md/mybrand/DESIGN.md --strict
```

4. The new brand is now available in the showroom (`?brand=mybrand`) and via `design-forge export mybrand`.

> `ingested.ts` / `ingested-specs.ts` are committed artifacts — never edit by hand. Re-run `pnpm gen:brands` after any spec change.

## 84 vs the issue's "74-source" count

Issue #2 was filed against a target of **74** brand specs living on the user's Windows
machine (`awesome-design-md/design-md/`). The corpus present on this Linux host actually
contains **84** ingested brands, a delta of **+10**. This is **not** a defect — it reflects
that the local `design-md/` has more (or differently-shaped) sources than the original 74:

- 76 `DESIGN.md` files + `starter.md` + 8 loose top-level `*.md` specs = 85 discoverable
  files; 84 ingest (1 loose file is a non-brand placeholder excluded by `isBrandSpec`).
- 71 of the 84 bake from real YAML front matter; 13 are genuine brand *prose analyses*
  (e.g. Kraken, Spotify) that lack front matter and are ingested best-effort.

If an exact 74-source set is required, reconcile by diffing the Windows
`awesome-design-md/design-md/` against this repo's `design-md/` — no transfer is needed
unless you want the upstream set verbatim. The ingester handles any count; the number
"74" was the original upstream target, not a hard requirement.
