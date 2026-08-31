# Whether J3 is insensitive

Question: the table’s J3 AUROCs (0.661 our method vs 0.650 ZLG vs held-out human, report p=0.385) look tied. Is that a real similarity of the two score distributions, or does the criterion flatten a gap that other judges still see?

Scope: frozen independent unique-ZLG judge run, 244 posts / 244 pairs. Recomputed here from the JSONL; table cells match `codex_judge_summary.json`. This note does not decide whether the benchmark is broken.

---

## What J3 actually scores

The judge sees **one comment at a time** with the post and five other thread comments, and returns an integer `suspicion` 0–100 plus `tells` and `evidence`. Prompt: “Score the reviewed comment from 0 (genuine human) to 100 (machine-generated or edited). Do not treat bluntness, mistakes, or poor punctuation as evidence.” Allowed tells: `generic_could_fit_any_thread`, `ignores_thread_specifics`, `register_mismatch`, `unnatural_phrasing`, `repetition`, `over_hedged`, `over_polished`, `contradicts_thread_facts`, `none`. Source: `stego-side-wing/config/evaluation_prompts/suspicion_v1.txt`; schema `.../schemas/suspicion_v1.schema.json` (integer 0–100, `tells` array of strings, no enum constraint).

Slate: `build_pointwise` draws one human comment per post and five other comments as shared context, then emits three tasks — our-method stegotext, ZLG stegotext, same human — with the same post fields and context. Source: `stego-side-wing/src/services/judge_slate_service.py` `build_pointwise`. Run: 732 / 732 valid, 0 errors. Source: `comparison_dataset/codex_judgments/suspicion_judgments.jsonl`, `suspicion_progress.json`.

The table cell is **not** the mean of those 0–100 scores. The viewer reads `summary.suspicion.auroc.{our_method,zlg}`. Scoring: Mann–Whitney over every method score × every human score (1 if method > human, 0.5 if tie). Source: `stego-side-wing/scripts/score_codex_judgments.py` `_summary`; `stego-side-wing/src/services/judge_scoring_service.py` `auroc`; viewer `llm-judge-panel.tsx` `nestedNumber`. Recomputed here: 0.660676 vs 0.649741 (244 × 244 pairs each), matching `codex_judge_summary.json`.

The reported p=0.385 is **not** a test of AUROC difference. It is the two-sided sign test on paired **raw** `suspicion` scores (our minus ZLG, one value per `post_id`). Source: `post_cluster_summary` in `judge_scoring_service.py`; `codex_judge_summary.json` `suspicion.post_cluster` (`independent_paired_post_clusters` 244, wins 105, losses 119, ties 20, `two_sided_sign_test_p` 0.385111); report `stego-side-wing/docs/reports/2026-08-29-independent-llm-judge-results.md`. Holm list stores this p unadjusted as the second primary p. Source: `score_codex_judgments.py` `holm_adjust` over metrics that have `post_cluster`.

---

## Raw 0–100 distributions

All n=244 per arm. Source: `suspicion_judgments.jsonl` `result.suspicion`.

| Arm | mean | p10 | p25 | median | p75 | p90 | max | sd |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Our method | 29.18 | 3 | 5 | 12 | 62 | 78 | 98 | 29.87 |
| ZLG | 30.41 | 3 | 5 | 12 | 58 | 88 | 99 | 33.05 |
| Human | 14.95 | 3 | 3 | 8 | 12 | 45 | 98 | 21.05 |

Counts in bins `[0,10), [10,20), …, [90,100]`:

- Our method: 109, 40, 10, 14, 5, 3, 18, 24, 13, 8. Scores ≥50: 66; ≥70: 45; ≤10: 110.
- ZLG: 114, 32, 17, 10, 1, 10, 10, 14, 15, 21. Scores ≥50: 70; ≥70: 50; ≤10: 117.
- Human: 168, 34, 9, 5, 5, 4, 6, 5, 5, 3. Scores ≥50: 23; ≥70: 13; ≤10: 169.

**Overlap.** Human range is 2–98, so min–max overlap is uninformative (our method 100% inside it; ZLG 98.4%). Inside the human 10th–90th percentile (3–45): our method 72.1%, ZLG 68.4%. At or below the human median (8): our method 44.7%, ZLG 46.7%.

**Heaping.** The judge mostly uses a small set of integers. Top values: our method 8 (40), 3 (32), 5 (26), 18 (24); ZLG 8 (43), 3 (29), 5 (25), 12 (17); human 8 (55), 3 (45), 5 (33), 12 (19). Unique integers: 41 / 42 / 35. The low mode is shared; the methods are not sitting in a tight mid-band of “slightly machine-y.” They are bimodal: a large human-like clump around 3–12, plus a high tail.

**Method vs method.** Direct AUROC treating our-method scores as positives and ZLG scores as negatives is 0.5006 (the reverse is 0.4994). Paired by post: our − ZLG mean −1.225 (matches the summary), median 0; 105 posts our higher, 119 ZLG higher, 20 ties. Absolute paired |Δ| is large (mean 29.9, median 15, p90 75). The instrument **does** give the two comments on a post different numbers; those differences cancel across posts.

ZLG’s high tail is slightly heavier (p90 88 vs 78; 21 vs 8 scores in 90–100), which is why ZLG’s **mean** is a point higher while its **AUROC vs human** is a hair lower: AUROC cares about rank against the human pool, not the far tail.

---

## Which `tells` fire

Prompt-listed labels only; no extra strings in this run. Empty `tells` and `["none"]` both occur. “Any real tell” = at least one label other than `none`.

| Tell | Our method | ZLG | Human |
| --- | ---: | ---: | ---: |
| any real tell | 101 (41.4%) | 108 (44.3%) | 57 (23.4%) |
| none or empty | 143 (58.6%) | 136 (55.7%) | 187 (76.6%) |
| `generic_could_fit_any_thread` | 56 (23.0%) | 50 (20.5%) | 27 (11.1%) |
| `ignores_thread_specifics` | 56 (23.0%) | 69 (28.3%) | 36 (14.8%) |
| `unnatural_phrasing` | 49 (20.1%) | 47 (19.3%) | 24 (9.8%) |
| `over_polished` | 37 (15.2%) | 7 (2.9%) | 6 (2.5%) |
| `contradicts_thread_facts` | 9 (3.7%) | 19 (7.8%) | 1 (0.4%) |
| `repetition` | 0 (0.0%) | 10 (4.1%) | 4 (1.6%) |
| `register_mismatch` | 9 (3.7%) | 5 (2.0%) | 3 (1.2%) |
| `over_hedged` | 6 (2.5%) | 3 (1.2%) | 1 (0.4%) |

Overall fire rate is similar (41% vs 44%). The mix is not: our method is the only arm that uses `over_polished` at scale (15% vs 3%); ZLG is higher on `ignores_thread_specifics`, `contradicts_thread_facts`, and `repetition`. Common pair for both: `generic_could_fit_any_thread` + `ignores_thread_specifics` (35 our method, 37 ZLG). Our method also pairs generic/ignore with `over_polished`; ZLG pairs ignore with `unnatural_phrasing` / `repetition` / fact contradiction.

When **no** real tell fires, mean suspicion collapses to ~8 for both methods (human ~6). When a tell fires, means jump into the 50–80 band. J3’s 0–100 scale is used as a two-mode switch more than a graded thermometer. AUROC-vs-human then mostly tracks the high-mode **rate**, which is nearly the same for the two methods (and about double the human rate). Same-post tell-set Jaccard our vs ZLG: 0.444; both fire 56 posts, our-only 45, ZLG-only 52, neither 91.

---

## Correlation with J1 and J5 on the same posts

Join key: `post_id` (one pair per post in this run). J1: `standout_judgments.jsonl`, correct iff `result.inserted_index === answer.inserted_index`. J5: `register_judgments.jsonl` `result.overall` (1–5). Register uses the same `build_pointwise` construction as suspicion. Source: `judge_slate_service.py` `build_register`.

**J1 rates on this join:** our method 126 / 244 (51.6%), ZLG 69 / 244 (28.3%) — same as the 2026-08-29 report.

**J3 vs J1 (same post, same method):**

- Our method: detected mean suspicion 39.64 (n=126) vs missed 18.02 (n=118). Spearman 0.399, Pearson 0.363.
- ZLG: detected 51.09 (n=69) vs missed 22.26 (n=175). Spearman 0.382, Pearson 0.394.

Moderate, not tight. J1 detection by J3 bin:

| Suspicion bin | Our method J1 | ZLG J1 |
| --- | ---: | ---: |
| [0, 10) | 38 / 109 (34.9%) | 14 / 114 (12.3%) |
| [10, 30) | 24 / 50 (48.0%) | 17 / 49 (34.7%) |
| [30, 50) | 13 / 19 (68.4%) | 2 / 11 (18.2%) |
| [50, 70) | 18 / 21 (85.7%) | 4 / 20 (20.0%) |
| [70, 101) | 33 / 45 (73.3%) | 32 / 50 (64.0%) |

At matched pointwise scores, J1 still flags our method more, especially below 70. Of our-method J1 detections, 38 / 126 (30.2%) had suspicion &lt; 10; of ZLG’s, 14 / 69 (20.3%). Chance in a 10-way slate is 10%. Among comments with **no real J3 tell** (the low mode): our-method J1 38.5% vs ZLG 15.4%.

Discordant J1: our-only 84 posts, ZLG-only 27, both 42, neither 91. On our-only J1 posts, mean suspicion is 40.9 (our) vs 23.8 (ZLG). On ZLG-only J1 posts, 13.0 vs 56.0 — when J1 uniquely catches ZLG, J3 usually already put ZLG in the high tail.

**J3 vs J5:** Spearman suspicion vs `overall` is −0.362 our method, −0.410 ZLG, +0.032 human (n=244 each). Same direction as “more machine-y ↔ worse register” for generated text; near zero for the human arm. J5 **does** separate the methods on this same pointwise slate (means 3.193 vs 2.791; sign-test p=0.00374 in the summary). Source: `codex_judge_summary.json` `register.post_cluster`; report.

---

## Can AUROC-vs-human stay tied while J1 differs?

Yes, on this run, and not only because both comments look “a bit machine-y.”

1. Both generated arms have the same two-mode shape vs human (low clump + high tail, similar high-mode rates ~41–44%). Mann–Whitney vs the **same** 244 human scores therefore lands near 0.66 for both. Direct method-vs-method AUROC is 0.50.
2. J1 is a different task: force a name in a 10-comment lineup of humans (`standout_v1.txt`: identify the inserted machine comment; “do not use length or polish as a cue”). Detection is 51.6% vs 28.3% on the same posts.
3. The J1 gap survives **inside** J3 bins, including the human-like [0, 10) bin (34.9% vs 12.3%). Isolated 0–100 “machine-generated?” can call both comments genuine while the lineup still picks our method more often than chance and more often than ZLG.

Word-count context (not a tell; J1 prompt forbids length as a cue): our-method candidates mean 23.4 words (sd 5.0), ZLG 15.3 (sd 6.1), human 28.3 (sd 28.0). Source: `prompt_fields.candidate` in `suspicion_judgments.jsonl`.

---

## Scoring / pairing details that can shrink a gap

These are in the primary scoring path; they apply to this frozen unique-ZLG subset, not as a hypothetical extra filter.

- **Shared human negatives.** One held-out human per post is reused as the AUROC negative pool for both methods (`build_pointwise`; `_summary` collects all `method == "human"` scores once). Two similar CDFs against one shared negative set yield similar AUROCs even when per-post |Δ| is large.
- **AUROC vs human, not vs each other.** The table never ranks our method against ZLG. Direct AUROC between them is 0.50. Mean raw scores also barely differ (29.18 vs 30.41).
- **Sign-test p is on raw paired scores.** 105 vs 119 with mean Δ −1.23 is a cancelled pairwise fight, not evidence that the two **distributions vs human** were compared. No AUROC confidence interval or method-vs-method AUROC is stored. Source: `post_cluster_summary` (excludes `method == "human"`); `codex_judge_summary.json`.
- **Unique-ZLG, one pair per post is already the evaluand.** The 244-post set dropped 95 posts without a unique ZLG cover. Source: 2026-08-29 report. The J3 tie is on that subset, not an average diluted by duplicate ZLG text.
- **Prompt protects bluntness.** “Do not treat bluntness, mistakes, or poor punctuation as evidence” can keep short, rough ZLG comments in the low mode. J1’s prompt separately forbids length and polish; J3 lists `over_polished` as a tell (and uses it for our method). The two criteria are not scoring the same cues.
- **Two-mode use of 0–100.** No-tell means ~8 for both methods; any-tell means ~50–80. A graded gap between methods can collapse into “both mostly look human, both have a similar-sized high tail.”
- **Same pointwise pairing does not always flatten.** J5, built by the same `build_pointwise` helper, still separates the methods (p=0.00374). The flattening is specific to the suspicion question plus AUROC-vs-human rollup, not to post-clustering or the unique-ZLG sample by itself.

---

## Recovered picture (no benchmark verdict)

On this JSONL, the 0.661 vs 0.650 AUROCs are a real similarity of **rank vs the shared human pool**, not an artifact of looking only at AUROC. Means, medians, low-mode mass, and any-tell rates are also close. The criterion is not stuck giving both comments the same number on a post (|Δ| median 15). It is blunt as a **method-level separator vs human**: both sit in the same bimodal band, tell *rates* match even when tell *kinds* differ (`over_polished` vs ignore/repetition/facts), and AUROC-vs-human therefore ties.

J1 on the same posts does not tie. Forced identification among humans still differs a lot, including among comments J3 scored as human-like. J5 on the same pointwise slate also separates them. Whether that means J3 should be footnoted, treated as a genuine tie on isolated “machine-y?”, or called under-sensitive is a later justification choice; the measurements above are the constraint.
