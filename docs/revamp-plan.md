# Viewer revamp: focus on ZLG + LLM-judge, cut benchmark UI, make it fast

Goal: the viewer becomes a *results* surface for the two things under active
research — the ZLG baseline comparison and the LLM-judge evaluations — and
nothing else. Benchmarks move to CLIs. Debug log surfaces move to agent-only
endpoints. Every retained page loads fast.

## Progress (2026-08-29)

Picked up after Claude ran out of usage. Two commits were already on `main`;
Phase 3 was uncommitted in the working tree.

| Phase | Status | What landed |
|---|---|---|
| 1. Cut the surface | **done** (`dd63936`) | Deleted `/dashboard`, `/showcase`, `/admin-api`, `/double-process-new-post`, `/prep-until-google-quota-then-stego`, `/single-post-twice-no-cache`. Explorer is the sidebar, not a nav entry. |
| 2. Logs agent-only | **done** (`3886c0e`) | Removed `/api-logs` and `/prompt-logs` pages. `GET /api/agent/logs?source=api\|prompt` remains. Fixed post-move log paths. |
| 3. Performance | **this session** | mtime cache, projected JSONL, bounded LUCID scan, paginated judgments, no fake tRPC delay, overnight snapshot ships latest-run rows only. |
| 4. Correctness | **this session** | Judge run stays the default; metrics/results fall back to the parent comparison run. Missing-artifact banner. Stego-process reads `embedding.senderAudit`. |
| 5. CLI | **this session** | `run_single_post_twice_no_cache.py --repeats N` writes a pass/fail artifact. |
| 6. Docs + gates | **this session** | `/method` explains LUCID and BARB. AGENTS/README/CLAUDE.md match the new surface. typecheck/check/build. |

## Measured baseline (dev server, 2026-08-29, before this session)

| Route | Time | HTML shipped |
|---|---|---|
| `/` | 0.18 s | 32 KB |
| `/overnight-findings` | 0.77 s | 7.3 MB |
| `/zlg-comparison` | 4.52 s | 44.6 MB |
| `/lucid` | 7.38 s | 7.2 MB |
| `/barb-comparison` | 0.73 s | 373 KB |
| `/method` | 0.51 s | 186 KB |
| `/stego-process` | 0.85 s | 31 KB |

`pnpm typecheck`: 20 errors across 4 files (then 13 after Phase 1).

## Defects found during survey

1. `/zlg-comparison` defaulted at `zlg_lucid_fresh_6x_20260815_independent_unique_judge`,
   which has judge artifacts and `paired_rows.jsonl` but **no** `results.jsonl`,
   `progress.json`, or `comparison_dataset/summary.json`. Metric tables were
   gated on `metricsSummary` and silently disappeared. The parent run
   `zlg_lucid_fresh_6x_20260815` has those files.
2. 44.6 MB payload: 43.6 MB of judgment JSONL passed whole to a client
   component. Only 8 of ~20 fields are read.
3. `/lucid` 7.4 s: sequential tail-read of 948 researched files + angle-count
   read of 772 files (830 MB dir) per request, `force-dynamic`, uncached.
4. `/dashboard` and `/showcase` were both `redirect("/overnight-findings")`.
   Orphaned `showcase-content.tsx` and `showcaseRouter` — deleted in Phase 1.
5. `stego-process-visual.tsx` read `item.sender_audit`; current artifacts nest
   it at `item.embedding.senderAudit`. The lookup always missed.
6. `admin-api-tool-panels-extended.tsx:665` called `parseStegoPayloadInput`
   (undefined) — deleted with the console.
7. Every tRPC procedure slept 100–500 ms in dev. That is why the explorer
   felt sluggish even when the filesystem was fine.

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
- Add an mtime-keyed filesystem cache: small interface, invalidates when a
  benchmark rewrites a file.
- Project judgment rows to the fields actually rendered, at the server
  boundary. Paginate the raw-judgments table.
- Parallelize and bound the LUCID dataset scan.
- Drop the T3-template artificial tRPC delay.
- Overnight snapshot: keep all-run totals, ship only latest-run table rows.
Target: every retained route < 1 s and < 2 MB after a warm cache.

Measured after this session (production `next start`, 2026-08-29):

| Route | Cold | Warm | HTML |
|---|---|---|---|
| `/method` | 0.04 s | — | 84 KB |
| `/zlg-comparison` | 0.50 s | 0.12 s | 1.36 MB (was 44.6 MB) |
| `/lucid` | 9.6 s first scan | 0.05 s | 134 KB (was 7.2 MB) |
| `/overnight-findings` | 0.19 s | 0.12 s | 38 KB (was 7.3 MB) |
| `/barb-comparison` | 0.06 s | — | 317 KB |
| `/stego-process` | 0.01 s | — | 7 KB |

Deleted `/dashboard`, `/showcase`, `/admin-api` return 404. LUCID cold is the
one remaining >1 s hit: a one-time 950-file scan, then the directory cache
makes reloads free.

### Phase 4 — correctness
- Keep the independent-judge run as the default (that is the live evaluation).
  When its metrics files are missing, load them from the parent comparison run
  and say so in a banner instead of rendering nothing.
- Fix the `senderAudit` path in the stego-process visualizer and read the
  current artifact fields (`embedding.commentBits` / `angleBits`, audit
  compression).

### Phase 5 — CLI benchmark
Generalize `run_single_post_twice_no_cache.py` into a repeat-determinism
benchmark: `--repeats N`, aggregate pass/fail reporting, run artifact. Tests.

### Phase 6 — docs + gates
Update `AGENTS.md`, `README.md`, workspace `CLAUDE.md`. `/method` explains
LUCID and BARB. Green `pnpm typecheck`, `pnpm check`, `pnpm build`; side-wing
`pytest` for the CLI.

## What LUCID and BARB are

**LUCID** is the tangent-generation research track: a codebook of
thread-grounded conversational intents (TangentsDB) that the angle sampler
draws from, so generated comments stay about the post. `/lucid` is the
clean-prep + historical 500-run dashboard. The 2026-08-08 freeze still holds:
do not retune admission/prompts off the contaminated first TangentsDB-v1 bulk
run. See `docs/lucid-results-viewer.md`.

**BARB** (*Bit-bearing Argumentative Reddit Bite*) is an *encode flavor* of
our own method, not a second baseline. It asks the generator for a pointed,
thread-specific, anti-platitude reply. `/barb-comparison` is BARB vs the
balanced control on the same posts. ZLG stays on `/zlg-comparison`. See
`docs/barb-comparison.md`.
