# Overnight Findings Dashboard Plan

## Goal

Update the results viewer so it clearly explains the latest stego-side-wing findings:

- Qwen is operationally strong after the decode/anchoring fixes.
- Large balanced runs now fail at a low rate instead of the earlier 54% Qwen baseline.
- Remaining failures are clustered in a few pathological posts/angles, not spread evenly.
- Security variants reached near-perfect decode reliability, but naturalness metrics still differ by strategy.
- The frontend should make those findings obvious without requiring users to open raw JSON.

## Source Runs To Support First

Use these side-wing run folders as initial fixtures/examples:

- `../stego-side-wing/metrics/e2e_runs/fresh_metrics_20260509T195758Z`
- `../stego-side-wing/metrics/e2e_runs/fresh_metrics_200_20260509T233342Z`
- `../stego-side-wing/metrics/e2e_runs/pareto_security_retry_rating_cont_20260509T213201Z`
- `../stego-side-wing/metrics/e2e_runs/overnight_balanced_20260510T041410Z`
- `../stego-side-wing/metrics/e2e_runs/overnight_balanced_20260510T064418Z`

The active/incomplete run may not have `summary.json`; the UI must still infer progress from:

- `<run>/<variant>/output-results/*.json`
- `<run>/<variant>/failures/*.json`
- `<run>/<variant>/metrics/*.json`
- `../stego-side-wing/metrics/e2e_runs/_runner_logs/*.log`
- `../stego-side-wing/metrics/e2e_runs/_runner_logs/overnight_sample_supervisor_20260510.jsonl`

## Key Findings To Present

### 1. Reliability Improved Dramatically

Show a headline comparison:

- Baseline Qwen failure rate: `54%`
- Fresh 25-sample batch: `0%` failure, `25/25`
- Fresh 200-sample batch: `8.5%` failure, `183/200`
- Completed overnight balanced batch: `1.9%` failure, `981/1000`
- Security variant comparison: `0.67%` failure, `298/300`

Primary copy:

> Decode reliability is no longer broadly broken. Current failures are concentrated in a small set of posts and failure modes.

### 2. Failures Are Clustered By Post

For completed balanced `1000` batch:

- `stego_invalid_json`: `9`
- `receiver_decode_validation_failed`: `10`
- Top post offenders:
  - `1nh7ptq`: repeated invalid JSON
  - `1lr283h`: repeated decode validation failure
  - `1mk37uu`: isolated decode failure
  - `1nql6ua`: isolated decode failure

For active second overnight batch observed so far:

- `stego_invalid_json`: `8`
- `receiver_decode_validation_failed`: `13`
- Top post offenders:
  - `1lr283h`: `8`
  - `1nh7ptq`: `7`
  - `1nql6ua`: `2`

The UI should emphasize that `1nh7ptq` and `1lr283h` deserve inspection pages.

### 3. Security Strategy Tradeoff

Security comparison result:

| Variant | Success | Receiver Success | Perplexity | Matched JSD |
|---|---:|---:|---:|---:|
| `security_legacy` | `50/50` | `1.0` | `88.36` | `0.521` |
| `sec_v2_anchored` | `50/50` | `1.0` | `96.76` | `0.532` |
| `sec_v2_guided_natural` | `50/50` | `1.0` | `119.57` | `0.589` |
| `sec_v2_natural_then_anchor_retry` | `50/50` | `1.0` | `112.99` | `0.582` |
| `sec_v2_guided_natural_hybrid_extract` | `49/50` | `1.0` | `109.81` | `0.567` |
| `sec_v2_natural_then_anchor_retry_hybrid_extract` | `49/50` | `1.0` | `112.83` | `0.564` |

Finding:

> Anchoring/guided paths are reliable, but `security_legacy` currently has the best naturalness metrics in this run.

## New Route

Add a route:

- `/overnight-findings`

Purpose:

- One executive dashboard for the latest ablation/overnight findings.
- Should not replace the generic JSON viewer.
- Should link to raw run folders or existing file viewer pages where possible.

## Data Layer

Add a server-side tRPC router, for example:

- `src/server/api/routers/overnight-findings.ts`

Suggested procedures:

- `listRuns`
  - Reads `../stego-side-wing/metrics/e2e_runs`.
  - Returns run names, timestamps, completion status, variants, output/failure counts.

- `getRunSummary`
  - Input: run directory name.
  - Reads `summary.json` if present.
  - Falls back to counting `output-results` and `failures` files.
  - Reads metric reports from `<variant>/metrics/*.json` when present.

- `getFailureClusters`
  - Input: run directory name.
  - Reads all `<variant>/failures/*.json`.
  - Normalizes errors into:
    - `stego_invalid_json`
    - `receiver_decode_validation_failed`
    - `receiver_payload_mismatch`
    - `stego_no_valid_candidate`
    - `infra_or_unknown`
  - Groups by failure code and post id.

- `getSupervisorStatus`
  - Reads `_runner_logs/overnight_sample_supervisor_20260510.jsonl`.
  - Shows whether a batch is active, last event timestamp, last started run id.

Keep filesystem access server-only.

## UI Layout

### Section 1: Status Strip

Cards:

- `Current Active Run`
- `Completed Overnight Samples`
- `Current Success Rate`
- `Delta vs 54% Baseline`
- `Top Failure Mode`
- `Top Pathological Post`

Use strong contrast:

- Green for success-rate improvement.
- Amber for clustered known failures.
- Red only for active blockers.

### Section 2: Reliability Timeline

Chart showing run sequence:

- `25 fresh`
- `200 fresh`
- `security 300`
- `overnight 1000`
- `active overnight`

Each point should show:

- requested samples
- successful samples
- failed samples
- failure rate
- completed/incomplete state

### Section 3: Failure Cluster Matrix

Table or heatmap:

- Rows: post ids.
- Columns: failure codes.
- Cell: failure count.

Default sort:

1. highest total failures
2. highest repeat across runs
3. most recent occurrence

Make `1nh7ptq` and `1lr283h` visually stand out if present.

### Section 4: Strategy Comparison

Variant cards/table for security runs:

- success rate
- receiver success rate
- perplexity
- matched-post JSD
- global JSD
- failures

Add a simple interpretation label:

- `Best reliability`
- `Best naturalness`
- `Needs inspection`

Do not oversell a strategy if samples are small.

### Section 5: Failure Inspector

Clicking a post/failure should show:

- post id
- run id
- variant
- sample file
- normalized failure code
- raw error
- nearby output samples for the same post if available
- selected angle if available
- generated `stegoText` if available

This is the core debugging surface for pathological posts.

### Section 6: Active Run Monitor

For incomplete runs:

- outputs count
- failures count
- attempts count
- estimated completion percent
- latest stderr tail if available
- latest supervisor event

The UI must handle missing `summary.json` gracefully.

## Visual Design Direction

Make this page feel like an investigation board, not a generic admin table.

Suggested style:

- Background: warm off-black or deep slate with subtle grid/noise.
- Accent colors:
  - success: mineral green
  - warning: amber
  - failure: muted red
  - neutral metrics: pale blue/gray
- Use large numeric cards and compact dense tables.
- Prefer clear annotated charts over decorative visuals.

Avoid:

- Purple default dashboard styling.
- Hiding raw file paths.
- Huge unstructured JSON blocks as the primary view.

## Data Types

Define frontend/server types roughly like:

```ts
type RunOverview = {
  name: string;
  path: string;
  lastWriteTime: string;
  hasSummary: boolean;
  requested: number | null;
  succeeded: number;
  failed: number;
  attempts: number;
  successRate: number | null;
  variants: string[];
};

type FailureCluster = {
  code: string;
  count: number;
  postIds: Array<{ postId: string; count: number }>;
  examples: Array<{
    runName: string;
    variant: string;
    file: string;
    postId: string;
    error: string;
  }>;
};

type VariantMetric = {
  runName: string;
  variant: string;
  requested: number;
  succeeded: number;
  failed: number;
  receiverSuccessRate: number | null;
  perplexity: number | null;
  matchedPostJsd: number | null;
  globalJsd: number | null;
};
```

## Implementation Steps

1. Add `overnight-findings` tRPC router.
2. Register it in `src/server/api/root.ts`.
3. Add filesystem parsers for run summaries, fallback output/failure counting, metrics parsing, and failure normalization.
4. Add route `src/app/overnight-findings/page.tsx`.
5. Build server/client components for:
   - status cards
   - reliability timeline
   - failure cluster matrix
   - variant comparison table
   - failure inspector
   - active run monitor
6. Add loading and empty states for missing/incomplete runs.
7. Add links back to raw JSON viewer where existing routing supports it.
8. Run:
   - `pnpm typecheck`
   - `pnpm check`

## Acceptance Criteria

- The page explains the 54% baseline improvement without opening JSON files.
- Completed and active runs are both visible.
- Missing `summary.json` does not break the page.
- Failure clusters clearly identify repeat offenders.
- Security variants can be compared by reliability and naturalness.
- Raw evidence remains reachable from each card/table row.
- No backend prompt/system files are touched.

## Suggested First Agent Task

Implement only the server-side data router and a minimal `/overnight-findings` page that renders:

- run overview cards
- failure cluster table
- security variant comparison table

Leave charts and richer styling for a second pass.
