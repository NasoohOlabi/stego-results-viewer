# Viewer revamp: focus on ZLG + LLM-judge, cut benchmark UI, make it fast

Goal: the viewer becomes a *results* surface for the two things under active
research — the ZLG baseline comparison and the LLM-judge evaluations — and
nothing else. Benchmarks move to CLIs. Debug log surfaces move to agent-only
endpoints. Every retained page loads fast.

## Measured baseline (dev server, 2026-08-29)

| Route | Time | HTML shipped |
|---|---|---|
| `/` | 0.18 s | 32 KB |
| `/overnight-findings` | 0.77 s | 7.3 MB |
| `/zlg-comparison` | 4.52 s | 44.6 MB |
| `/lucid` | 7.38 s | 7.2 MB |
| `/barb-comparison` | 0.73 s | 373 KB |
| `/method` | 0.51 s | 186 KB |
| `/stego-process` | 0.85 s | 31 KB |

`pnpm typecheck`: 20 errors across 4 files.

## Defects found during survey

1. `/zlg-comparison` renders **zero** metric rows. `RUN_DIR` points at
   `zlg_lucid_fresh_6x_20260815_independent_unique_judge`, which has no
   `comparison_dataset/summary.json`, no `results.jsonl`, no `progress.json`.
   All metric tables are gated on `metricsSummary` and silently disappear.
2. 44.6 MB payload: 43.6 MB of judgment JSONL passed whole to a client
   component. Only 8 of ~20 fields are read.
3. `/lucid` 7.4 s: sequential tail-read of 948 researched files + angle-count
   read of 772 files (830 MB dir) per request, `force-dynamic`, uncached.
4. `/dashboard` and `/showcase` are both `redirect("/overnight-findings")`.
   `showcase-content.tsx` (476 L) and `showcaseRouter` (412 L) are orphaned.
5. `stego-process-visual.tsx` reads `item.sender_audit`; current artifacts nest
   it at `item.embedding.senderAudit`. The lookup always misses and the
   visualizer falls back to hardcoded demo values.
6. `admin-api-tool-panels-extended.tsx:665` calls `parseStegoPayloadInput`,
   which is not defined or imported — a runtime crash.

## Phases

### Phase 1 — cut the surface area
Delete, with their routers/components/nav entries:
- `/dashboard`, `/showcase` (dead redirects)
- `/admin-api` (API console, ~8 000 L)
- `/double-process-new-post`, `/prep-until-google-quota-then-stego` (benchmarks)
- `/single-post-twice-no-cache` (becomes a CLI)
Drop the duplicate `/` nav entry — the results explorer *is* the sidebar.

### Phase 2 — logs become agent-only
Remove `/api-logs` and `/prompt-logs` pages and nav entries. Keep the data
reachable for agents via documented endpoints; keep the tRPC routers.

### Phase 3 — performance
- Add an mtime-keyed filesystem cache module: small interface, invalidates
  correctly when a benchmark rewrites a file.
- Project judgment rows to the fields actually rendered, at the server
  boundary. Paginate the raw-judgments table.
- Parallelize and bound the LUCID dataset scan.
Target: every retained route < 1 s and < 2 MB.

### Phase 4 — correctness
- Resolve the ZLG run directory to one that actually has metrics; surface a
  visible banner when an artifact is missing instead of rendering nothing.
- Fix the `senderAudit` path in the stego-process visualizer and extend it to
  the current artifact fields.

### Phase 5 — CLI benchmark
Generalize `run_single_post_twice_no_cache.py` into a repeat-determinism
benchmark: `--repeats N`, aggregate pass/fail reporting, run artifact. Tests.

### Phase 6 — docs + gates
Update `AGENTS.md`, `README.md`, workspace `CLAUDE.md`. Green `pnpm typecheck`,
`pnpm check`, `pnpm build`; side-wing `pytest` + `pyright` for the CLI.
