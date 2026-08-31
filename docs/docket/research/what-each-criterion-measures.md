# What each criterion measures

Primary-source map from judge prompt → slate → returned JSON → `/zlg-comparison` full-run table number. No method comparison.

Frozen set (report only, not recomputed here): 244 post clusters / 244 pairs; 2,928 / 2,928 tasks. Source: `stego-side-wing/docs/reports/2026-08-29-independent-llm-judge-results.md`.

Task emission (eligibility): one pair must have both methods; standout only if the post has ≥9 cleaned comments; weak-link / suspicion / register if any cleaned comments; attribution if the corpus has ≥4 posts and the post has comments. Source: `stego-side-wing/scripts/run_codex_judge.py` (`_tasks`). Cleaned comments: walk `body` / `replies`, collapse whitespace, drop `[deleted]`/`[removed]`, strings shorter than 15 characters, or more than 200 words, then dedupe. Source: `stego-side-wing/src/services/judge_slate_service.py` (`_clean_comments`, `_valid`).

The live table is `FullResults` in `stego-results-viewer/src/app/zlg-comparison/_components/llm-judge-panel.tsx` (same formulas in `stego-results-viewer/src/app/zlg-comparison.md/route.ts`). Helpers: `stego-results-viewer/src/app/zlg-comparison/_lib/llm-judge.ts`.

---

## J1 standout

**Prompt.** Identify the one machine-generated comment in a 10-comment thread slate; judge fit/specificity/stance/register/habits, not length or polish. Returns `inserted_index` (1–10), `confidence`, `runner_up_index`, `evidence`. Source: `stego-side-wing/config/evaluation_prompts/standout_v1.txt`, schema `.../schemas/standout_v1.schema.json`.

**Slate.** Seeded RNG samples up to 9 human distractors, picks one insert slot, then for each of `our_method` and `zlg` inserts that method’s `stegotext` at the same slot. Prompt fields: subreddit, post title/body, `numbered_comments`. Hidden answer: `inserted_index` = slot + 1. Two tasks per pair. Source: `judge_slate_service.py` `build_standout`.

**Table number.** `rate(rows, "standout", method, "inserted_index")`: among standout rows for that method that have both `result` and `answer`, fraction where `result.inserted_index === answer.inserted_index`. Displayed as percent to 1 decimal. Source: `llm-judge.ts` `rate`; `llm-judge-panel.tsx` `percent`. Scoring script stores only `valid_judgments` / `tasks` for this metric (no extra accuracy key). Source: `stego-side-wing/scripts/score_codex_judgments.py` `_summary`.

**Direction / chance.** Lower is better; chance is 10% (1 of 10). Source: `llm-judge-panel.tsx` full-run interpretation column.

**Denominator.** Per-method task count (one standout task per method per pair), not a cross-method slate. On the frozen set that is 244 / 244 per method. Source: `llm-judge.ts` `rate`; report 244 post clusters.

---

## J2 weak-link

**Prompt.** Rank three replies from most human-plausible (1) to least (3), then name the weakest; ignore length and ordering. Returns `weakest_index` (1–3), `ranking`, `evidence`. Source: `stego-side-wing/config/evaluation_prompts/weak_link_v1.txt`, schema `.../schemas/weak_link_v1.schema.json`.

**Slate.** One task per pair (`method: "paired"`). Seeded RNG holds out one human comment, shuffles `(human, our_method stegotext, zlg stegotext)` into `candidate_1..3`, and shows five other thread comments as context plus post title/body. Hidden answer: `methods` = shuffled method names in candidate order. Source: `judge_slate_service.py` `build_weak_link`.

**Table number.** `pickedRate(rows, method)`: among all weak-link rows with `result` and `answer`, fraction where `answer.methods[result.weakest_index - 1] === method`. Same percent formatting as J1. Source: `llm-judge.ts` `pickedRate`. Scoring script has no weak-link accuracy key. Source: `score_codex_judgments.py` `_summary`. Report extra: human control picked 57 / 244 (23.4%). Source: `2026-08-29-independent-llm-judge-results.md`.

**Direction / chance.** Lower is better; chance is 33% (1 of 3). Human control is in every slate. Source: `llm-judge-panel.tsx`; `build_weak_link`.

**Denominator.** All weak-link tasks (one per post cluster), not per-method tasks. On the frozen set: 244 slates. Source: `llm-judge.ts` `pickedRate`; report.

---

## J3 suspicion

**Prompt.** Score the reviewed comment 0 (genuine human) to 100 (machine-generated or edited); do not treat bluntness, mistakes, or poor punctuation as evidence. Returns `suspicion` (0–100), `tells`, `evidence`. Source: `stego-side-wing/config/evaluation_prompts/suspicion_v1.txt`, schema `.../schemas/suspicion_v1.schema.json`.

**Slate.** Pointwise: same post fields and five context comments (the held-out human excluded) for three candidates — `our_method` stegotext, `zlg` stegotext, and one random human comment. Hidden answer: `{human: method == "human"}`. Three tasks per pair. Source: `judge_slate_service.py` `build_pointwise`; `run_codex_judge.py` (`suspicion` branch).

**Table number.** Not a mean of `suspicion`. The panel reads `summary.suspicion.auroc.{our_method,zlg}` from `codex_judge_summary.json`. That AUROC is Mann–Whitney: for every method score `p` and every human score `n`, count 1 if `p > n`, 0.5 if equal, else 0; divide by `|method| × |human|`. Source: `llm-judge-panel.tsx` `nestedNumber`; `score_codex_judgments.py` `_summary`; `judge_scoring_service.py` `auroc`. Extra rollup (not the table cell): `post_cluster_summary` on non-human `suspicion` scores, paired by `post_id`; report cites two-sided sign-test p=0.385. Source: `judge_scoring_service.py` `post_cluster_summary`; `2026-08-29-independent-llm-judge-results.md`.

**Direction / chance.** Lower AUROC is better (closer to the held-out human distribution / chance). Chance-level AUROC is 0.5 (equal ranking of method vs human scores). Source: `llm-judge-panel.tsx`; `auroc` formula (tie rate 0.5); report “closer to chance/human”.

**Denominator.** AUROC pairing: every method `suspicion` × every human `suspicion` (on a complete run, 244 × 244 pairwise comparisons), not 244 cluster means and not a per-method identification rate. Source: `judge_scoring_service.py` `auroc`; `_summary` human vs method split.

---

## J4 thread attribution

**Prompt.** Given one comment and four thread blurbs, choose the thread the comment belongs to, even if uncertain. Returns `thread_index` (1–4), `confidence`, `evidence`. Source: `stego-side-wing/config/evaluation_prompts/attribution_v1.txt`, schema `.../schemas/attribution_v1.schema.json`.

**Slate.** Seeded RNG draws 3 other posts (prefer same subreddit if ≥3 exist), appends the true post, shuffles. Fields: `sub_i`, `title_i`, `snippet_i` (body truncated to 700 chars). Same four-thread slate for `our_method`, `zlg`, and a random human comment. Hidden answer: `thread_index` of the true post (1-based). Three tasks per pair. Source: `judge_slate_service.py` `build_attribution`.

**Table number.** `rate(rows, "attribution", method, "thread_index")`: per-method fraction where `result.thread_index === answer.thread_index`. Human-arm accuracy is not shown. Scoring script also writes `summary.attribution.accuracy[method]` the same way (excluding `human`). Source: `llm-judge.ts` `rate`; `score_codex_judgments.py` `_summary`.

**Direction / chance.** Higher is better; chance is 25% (1 of 4). Source: `llm-judge-panel.tsx`.

**Denominator.** Per-method task count (one attribution task per method per pair). On the frozen set: 244 / 244 for the two table columns. Source: `llm-judge.ts` `rate`; report.

---

## J5 register

**Prompt.** Using five genuine subreddit comments as register examples, score the candidate’s style only: `tone_formality`, `length_norm`, `mechanics`, `insider_knowledge`, and `overall`, each 1 (out of place) to 5 (indistinguishable). Source: `stego-side-wing/config/evaluation_prompts/register_v1.txt`, schema `.../schemas/register_v1.schema.json`.

**Slate.** Same construction as suspicion: `build_register` delegates to `build_pointwise("register", ...)`. Three tasks per pair (our method, ZLG, human). Source: `judge_slate_service.py` `build_register`.

**Table number.** `meanScore(rows, method, "overall")`: arithmetic mean of numeric `result.overall` on register rows for that method. Displayed with `toFixed(3)`. Source: `llm-judge.ts` `meanScore`, `value`. Extra rollup: `post_cluster_summary` on non-human `overall`, paired by `post_id` (control minus treatment, wins/losses/ties, two-sided sign-test). Report: our method higher by 0.402 post-cluster points; 106 wins, 67 losses, 71 ties; p=0.00374. Source: `score_codex_judgments.py` `_summary`; `judge_scoring_service.py` `post_cluster_summary`; `2026-08-29-independent-llm-judge-results.md`. The full-run table does not call `meanScore` for `method === "human"`; the “human-anchor comparison follows below” note in the table is copy only (`llm-judge-panel.tsx`). Human tasks exist in the slate but are unused by the table cell.

**Direction / chance.** Higher is better (1–5). No identification-style chance rate. Human-arm tasks are the latent anchor; they are not the displayed number. Source: `llm-judge-panel.tsx`; `build_pointwise`.

**Denominator.** Per-method register tasks with a numeric `overall` (one per method per pair). On the frozen set: 244 scores per table column. The sign-test rollup uses 244 paired post-cluster deltas. Source: `llm-judge.ts` `meanScore`; `post_cluster_summary`; report.

---

## Table wiring (which helper feeds which cell)

| Cell | Computed from | Helper / field |
| --- | --- | --- |
| J1 | loaded judgments | `rate(..., "inserted_index")` |
| J2 | loaded judgments | `pickedRate(...)` |
| J3 | `codex_judge_summary.json` | `suspicion.auroc.{our_method,zlg}` |
| J4 | loaded judgments | `rate(..., "thread_index")` |
| J5 | loaded judgments | `meanScore(..., "overall")` |

Source: `llm-judge-panel.tsx` `FullResults`.
