# BARB comparison viewer

Route: `/barb-comparison` (markdown export: `/barb-comparison.md`).

Compares the **BARB** encode flavor (*Bit-bearing Argumentative Reddit Bite*)
against the **balanced** control on the same posts/angles. This is an
inside-the-method flavor delta — ZLG stays on `/zlg-comparison`.

## Pointing at a run

```bash
# Absolute path to a finished pilot run
export BARB_RUN_DIR=/path/to/stego-side-wing/metrics/experiments/barb/runs/<run_id>

# Windows (PowerShell)
$env:BARB_RUN_DIR = "D:\Master\code\stego\stego-side-wing\metrics\experiments\barb\runs\<run_id>"
```

Without `BARB_RUN_DIR`, the loader looks under:

```text
../stego-side-wing/metrics/experiments/barb/runs/
```

Resolution order:

1. `BARB_RUN_DIR` (env)
2. `runs/pinned/` directory, or a pin file (`PINNED` / `pinned.txt` / `.pinned`)
   whose first line is a run id
3. Newest subdirectory under `runs/` (by mtime)

## Expected artifact layout

```text
stego-side-wing/metrics/experiments/barb/runs/<run_id>/
  balanced/                 # control lane outputs
  barb/                     # BARB lane outputs
  comparison/
    paired_rows.jsonl       # method: balanced | barb
    summary.json
    manifest.json
```

`paired_rows.jsonl` rows (from `build_barb_variant_comparison_dataset.py`):

- `post_id`, `sample_index`, `method` (`balanced` | `barb`)
- `stego_text`, `encode_succeeded`, `receiver_match`, `itt_success`, `word_count`
- `failure_code`, `error`
- `features.has_thread_proper_noun_overlap`, `features.has_numeral`,
  `features.safe_universal_hit`, `features.has_affect_opinion_cue`

`summary.json`: `run_dir`, `paired_posts`, `row_count`,
`methods.balanced` / `methods.barb` rates (`itt_success_rate`,
`receiver_match_rate`, `mean_word_count`, `safe_universal_rate`,
`thread_specificity_rate`, `affect_opinion_rate`), plus `sign_tests[]`.

Pairs join on `(post_id, sample_index)`. If the run dir or comparison files are
missing, the page shows an empty state instead of crashing.

## Lean-in attributes (UI callouts)

- Thread specificity
- Strong emotion / opinion (varied register — **not** always sarcastic)
- Pointed argument
- Anti-platitude
