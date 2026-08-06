# Stego Results Viewer

A local Next.js dashboard for the **zero-shot generative linguistic steganography**
research project. It reads the JSON artifacts produced by the
[`stego-side-wing`](../stego-side-wing) backend and makes them understandable:
it explains the method, renders every generated sample, and shows the progress
of generation jobs.

> New here? Open **`/method`** ("How it works") first — it walks through the
> method in plain language and points you at the page that shows each part.

## What the method is (in one paragraph)

A secret payload is hidden inside an ordinary, fully visible LLM-generated
Reddit-style comment. The payload is **not** stored in invisible characters —
it is carried by *which* comment and *which* conversational "angle" the sender
chose to reply to (the **selection channel**). A receiver who shares the same
post and settings rebuilds the same options, reads back those choices, and
recovers the payload. See `../stego-side-wing/docs/development/stego-sender-receiver-pipeline.md`
for the authoritative pipeline description; `/method` in this app summarizes it.

## Pages

| Route | What it shows |
|-------|---------------|
| `/method` | **Start here.** Plain-language explanation of the method, the result-file fields, and which page shows what. |
| `/` | Results explorer — browse every sample JSON by post/artifact id, structured or raw view. |
| `/stego-process` | Step-by-step visualization of one sample through the sender → carrier → receiver stages. |
| `/workflows-runs` | Live pipelines (`GET /workflows/runs`) **and** on-disk sample-generation progress per run (done / failed / attempted). |
| `/dashboard` | Charts and distributions over synced stats. |
| `/zlg-comparison` | Compare samples against the NAACL'24 ZLG baseline. |
| `/showcase` | Curated highlight view of selected results. |
| `/overnight-findings` | Latest overnight metrics summary plus the current research-state/provenance notice. |
| `/admin-api`, `/double-process-new-post`, `/prep-until-google-quota-then-stego` | Drive the side-wing HTTP API end-to-end with live SSE progress. |
| `/api-logs`, `/prompt-logs`, `/workflow-llm-prompts` | Inspect API logs, prompt logs, and prompt templates. |

Use **⌘K / Ctrl+K** or the left rail to move between views.

## Where the samples come from

The viewer reads result JSON directly from the sibling `stego-side-wing` repo —
no database or copy step. `src/server/paths.ts` discovers sources:

- **Side Wing default** → `../stego-side-wing/output-results`
- **Local** → `./output-results` in this repo
- **Generated runs** → every `output-results/` folder found under
  `../stego-side-wing/metrics/{e2e_runs,model_ablation_runs,feedback_runs,angle_scan_runs}`.
  Each is labeled by its run and profile (e.g.
  `e2e_runs/quality_100x_20260711 / balanced`) with its sample count.

Sources that actually contain samples are listed first, and the default source
auto-selects the first non-empty one so the explorer never opens on an empty
folder. Pick a source in the file explorer's **Result source** dropdown, or add
any absolute path via the settings gear.

Sample-generation progress on `/workflows-runs` is derived from each run's
on-disk layout (`<run>/<profile>/{dataset, input-angles, output-results,
failures}`), so it works even when the side-wing API process is not running.

## Current research state

The active LUCID bulk artifact is
`LUCID_context_weighted_v2_balanced_500`: 381 succeeded of 500 requested,
using 64 reused frozen posts. It is blocked and is not a completed paired ZLG
benchmark. Its run metadata lacks a Git SHA/branch and records a dirty worktree;
the nearest pre-run committed base is side-wing `0353848` on
`fix/zlg-benchmark-overhaul`, which is context rather than a reproducible pin.
The `/overnight-findings` page exposes this distinction.

## Rendering samples

Each result file is an array with one entry containing `stegoText`, an
`embedding` block (compression + comment/angle selection channels), and the
source `post`. Zod schemas in `src/schemas/` are matched to React renderers via
`src/schemas/registry.ts` (first successful parse wins). To support a new result
shape: add a schema, add a renderer under `src/app/_components/renderers/`, and
register the pair — order matters.

## Prerequisites

- **Node + pnpm.**
- The **`stego-side-wing`** repo checked out as a sibling directory (this app
  resolves `../stego-side-wing`).
- For the live end-to-end / admin pages, the side-wing HTTP API running
  (default `http://localhost:5001/api/v1`; configurable in the UI). The
  static explorer, sample rendering, and generation-progress views work
  **without** the API — they read files directly.

## Running

```bash
pnpm install
pnpm dev          # Next dev with Turbopack
pnpm build        # production build
pnpm start        # serve the production build
pnpm typecheck    # tsc --noEmit
pnpm check        # biome check .
pnpm check:write  # biome check --write .
```

## Tech stack

Next.js 15 (App Router, React 19), tRPC v11 + TanStack Query, Zod, Tailwind CSS
4, Biome, `better-sqlite3` (stats DB), CodeMirror (raw JSON). Path alias `~/` →
`src/`.

## More detail

See [`AGENTS.md`](./AGENTS.md) for architecture, data-source resolution, the
side-wing API contract (`api-spec.md`), and safe-extension guidance.
