# LUCID results viewer

The `/lucid` route reads the completed Project LUCID run summary directly from:

```text
../stego-side-wing/metrics/e2e_runs/LUCID_context_weighted_v2_balanced_500/summary.json
```

It displays the intention-to-treat requested, succeeded, failed, and success-rate
counts, plus the cached-angle artifact provenance. The route is dynamically rendered
so a refreshed page reflects the latest written summary. As of 2026-08-03 the
artifact is blocked at **381 succeeded / 500 requested** (119 failed; 76.2%).

The 500 attempts reuse the available frozen source posts. The success rate is useful
as an intention-to-treat result, but statistical uncertainty must be clustered by
source post; it is not a 500-independent-post estimate.

The run did not persist a Git commit or branch and declares a dirty worktree.
The nearest committed base before it started was side-wing `0353848` on
`fix/zlg-benchmark-overhaul`; this is context only, not a reproducible code pin.
The latest completed recalibrated ZLG lane is 510/554, but it uses an older,
unpaired source summary and must not be presented as a LUCID comparison.
