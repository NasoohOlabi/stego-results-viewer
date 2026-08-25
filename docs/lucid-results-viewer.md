# LUCID results viewer

The `/lucid` route reads the Project LUCID run summary and progress from:

```text
../stego-side-wing/metrics/e2e_runs/LUCID_context_weighted_v2_balanced_500/
  summary.json
  progress.json
  balanced/failures/*.json
```

It also reads the live clean preparation dataset from:

```text
../stego-side-wing/datasets/prep_runs/LUCID/tangents_db_v1_fresh/
  news_url_fetched/*.json
  news_researched/*.json
  news_angles/*.json
  output-results/*.json
  service/campaign_*_state.json
```

The fresh-dataset panel shows live stage counts, worker status and deadlines,
non-empty-research and 32-angle integrity checks, the angle-count distribution,
and the 12 most recently updated angle-ready samples. Sample rows expose source
and tangent previews without copying the large artifacts into the viewer repo.

It shows intention-to-treat counts, failure-code totals, candidate-level failure
taxonomy aggregates, unique-post count, and git provenance fields when present.
A banner marks the current artifact as a **context-weighted v2 sampler baseline**,
not TangentsDB-v1 (`project_lucid/tangents_db/v1`).

As of 2026-08-03 the baseline artifact is blocked at **381 / 500** (76.2%).
Failures are mostly `receiver_angle_mismatch` with far decode mismatches.

TangentsDB-v1 pilots use a separate run dir and
`WORKFLOW_TANGENT_DB_BUILDER=lucid` (see
`stego-side-wing/docs/plans/project-lucid-tangentdb-and-feedback-loop.md`).
The first TangentsDB-v1 500-run
(`LUCID_tangents_db_v1_balanced_500`, 371/500) reused contaminated
`news_researched` caches and is **not** decision-grade; the LUCID refactor is
frozen pending clean samples (2026-08-08 conclusion in that plan).
Do not present unpaired ZLG lanes as a LUCID comparison.
