# Does J1 detection track length and slate composition?

AFK research for docket ticket 05, testing a collaborator's hypothesis that J1 "standout" detection is driven by comment length and slate composition rather than content quality.

## Gate — reproduce the headline numbers

Files used (all under `d:\Master\code\stego\stego-side-wing\metrics\zlg_comparison_runs\zlg_lucid_fresh_6x_20260815_independent_unique_judge\comparison_dataset\`):

- `codex_judgments\standout_tasks.jsonl` — 488 lines, one per (`method` × `pair_id`) task. Fields used: `task_id`, `pair_id`, `post_id`, `method` (`our_method` / `zlg`), `prompt_fields.numbered_comments` (the 10-item numbered slate text).
- `codex_judgments\standout_judgments.jsonl` — 488 lines. Fields used: `task_id`, `method`, `answer.inserted_index` (also embedded here, matches the standalone key on all 488), `result.inserted_index`, `result.confidence`, `result.runner_up_index`, `result.evidence`.
- `codex_judgments\standout_answer_key.jsonl` — 488 lines, `task_id` → `answer.inserted_index`. Used as the authoritative ground truth; cross-checked against the `answer` block embedded in the judgments file (0 mismatches on 488).

Join key: `task_id` (1:1:1 across the three files, 488/488/488, no missing joins). "Correct" = `result.inserted_index == answer.inserted_index` on the same `task_id`.

Recomputed:

| Method | Correct | n | Rate |
| --- | ---: | ---: | ---: |
| our_method | 126 | 244 | 51.6% |
| zlg | 69 | 244 | 28.3% |

**Gate: PASS.** This reproduces the specified 126/244 (51.6%) and 69/244 (28.3%) exactly. Proceeding to the length analysis.

Parsing note: `numbered_comments` is a single string with items separated by newlines, matched by the regex `^(\d{1,2})\.\s` in `MULTILINE` mode and sliced between successive matches (a few comments themselves contain embedded newlines, which breaks a naive `str.split('\n')`; the regex-slice approach parses all 488 tasks into exactly 10 numbered comments each with zero failures). Word count = `len(text.split())`; character count = `len(text)` on the sliced, newline-stripped comment text.

Each of the 244 posts contributes two tasks (`our_method`, `zlg`) that share the same 9 human distractor comments and the same insert slot, differing only in which text is inserted — confirmed here by the two methods' distractor-length statistics (Test 3) being numerically identical distributions.

## Verdict

**Refuted, with one small real effect.** The single most decisive number is Test 6: restricted to slates where the inserted comment does *not* stand out on length (rank 4–7 of 10), our method is still detected 87/178 = 48.9%, barely below its unconditional rate of 51.6%, and ZLG is still detected 46/135 = 34.1% vs its unconditional 28.3% — both far above the 10% chance floor, and our method still leads ZLG by ~15 points with length rank held constant. Length-gap correlations with detection are real but weak (point-biserial r = 0.14–0.22, Spearman ρ = 0.19–0.26 depending on method/units) — length nudges detection a little, it does not drive it. Two sub-tests actively point the other way: judge evidence strings that explicitly use length/brevity language are *more* common among misses than hits (both methods), and detection is *higher*, not lower, in slates where the human distractors are length-uniform (opposite of the "stands out amid high variance" mechanism). The one piece that mildly supports the collaborator: our method's detection rate does climb from ~46–54% to 80% in the rare (n=15/244) slates where its comment is the longest or second-longest in the slate — but that is a small tail effect, not the main story, and it is much weaker or absent for ZLG.

## Test 1 — per-slate relative length

Word-count-based statistics of the *inserted* comment against its own 10-comment slate (n=244 tasks per method; rank 1 = shortest of 10, ties get averaged rank; z-score and ratio are computed against the 10-comment slate's own mean/median).

| Method | n | word count mean (sd) | rank mean (sd) | z-score mean (sd) | ratio-to-median mean (sd) |
| --- | ---: | ---: | ---: | ---: | ---: |
| our_method | 244 | 23.4 (5.0) | 6.21 (1.52) | −0.11 (0.45) | 1.22 (0.45) |
| zlg | 244 | 15.2 (6.0) | 4.47 (1.94) | −0.45 (0.42) | 0.87 (0.44) |

This matches the prior note's word-count means (our method 23.4/5.0, ZLG 15.3/6.0). Both methods' inserted comments sit *below* the median rank of their slate on average (our method's average rank 6.2 is just above the midpoint of 5.5; ZLG's average rank 4.47 is below it) — neither method is reliably the longest comment shown; ZLG in particular tends to be shorter than the slate median (mean z = −0.45, mean ratio 0.87).

## Test 2 — detection rate by length-rank bucket

Rank buckets are fixed on the 1–10 scale (rank 1 = shortest). n is the count of tasks whose inserted comment fell in that rank bucket.

| Rank bucket | our_method correct/n | our_method rate | zlg correct/n | zlg rate |
| --- | ---: | ---: | ---: | ---: |
| 1–2 (shortest) | 0/1 | 0.0% | 9/37 | 24.3% |
| 3–4 | 12/26 | 46.2% | 15/87 | 17.2% |
| 5–6 | 49/104 | 47.1% | 24/78 | 30.8% |
| 7–8 | 53/98 | 54.1% | 19/38 | 50.0% |
| 9–10 (longest) | 12/15 | 80.0% | 2/4 | 50.0% |

Bucket ns sum to 244 for each method. Our method's detection is close to flat (46–54%) across ranks 3–8, where 228/244 (93%) of its tasks fall, then rises to 80% in the thin longest-rank tail (n=15). ZLG shows a steadier climb across the whole range (24% → 17% → 31% → 50% → 50%, though the two extreme buckets have small n: 37 and 4). Read together with Test 1 (ZLG's inserted comment is usually below-median rank), this is consistent with length being a real but secondary signal for ZLG, and a marginal one for our method except at its length extreme.

## Test 3 — distractor shortness

For each of the 244 posts, computed over the 9 human distractors shared by both methods' tasks (values are identical across methods by construction, confirmed numerically):

| Statistic | n (posts) | mean | sd | median | min | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| distractor median word count | 244 | 20.8 | 9.1 | 19.0 | 7 | 56 |
| distractor mean word count | 244 | 29.9 | 10.4 | 29.1 | 9.1 | 61.8 |

Distribution of how many of the 9 distractors are under 5 words (n=244 posts): 0 distractors: 163, 1: 65, 2: 14, 3: 2. **No post has a majority of distractors under 5 words** — the collaborator's literal "yes / I agree" scenario essentially does not occur in this dataset.

Distribution of how many of the 9 distractors are under 10 words (n=244 posts): 0: 22, 1: 72, 2: 71, 3: 48, 4: 22, 5: 6, 6: 3. Most slates have 1–3 short (<10-word) distractors out of 9, not a majority.

Detection rate, splitting posts at the median distractor-median-word-count (19.0 words) into "mostly short" (≤19, n=128) vs "mostly long" (>19, n=116) slates — this is the collaborator's exact scenario:

| Method | Mostly-short slate correct/n | Rate | Mostly-long slate correct/n | Rate |
| --- | ---: | ---: | ---: | ---: |
| our_method | 71/128 | 55.5% | 55/116 | 47.4% |
| zlg | 36/128 | 28.1% | 33/116 | 28.4% |

Our method shows an 8-point bump in short-distractor slates (directionally consistent with the hypothesis, but modest). **ZLG shows essentially zero effect** (28.1% vs 28.4%) — if short distractors made the inserted comment "stand out," ZLG's detection (which is length-adjacent per Test 2) should have moved more than this. An absolute-threshold split (<8 vs ≥8 median distractor words) was also tried but is degenerate here (only 1/244 posts falls below 8 words), so the median split above is the meaningful cut.

## Test 4 — length GAP vs detection (the decisive correlational test)

Gap = inserted comment's word count minus the slate's 9-distractor median word count, computed per task (n=244 each method).

| Method | Point-biserial r (gap vs. detected) | Spearman ρ |
| --- | ---: | ---: |
| our_method | 0.156 | 0.187 |
| zlg | 0.144 | 0.187 |

Both correlations are weak positive (r² ≈ 2–3.5%) — length gap explains very little of the variance in whether a comment is detected.

Detection rate by gap decile (word gap; deciles computed within each method's own 244 tasks, n≈24–25 per decile):

**our_method**

| Decile | gap range (words) | n | correct | rate |
| --- | --- | ---: | ---: | ---: |
| D1 (most negative gap) | [−37, −9] | 24 | 11 | 45.8% |
| D2 | [−9, −4] | 25 | 9 | 36.0% |
| D3 | [−3, −1] | 24 | 16 | 66.7% |
| D4 | [−1, 2] | 25 | 6 | 24.0% |
| D5 | [2, 3] | 24 | 9 | 37.5% |
| D6 | [3, 5] | 24 | 14 | 58.3% |
| D7 | [6, 8] | 25 | 11 | 44.0% |
| D8 | [9, 11] | 24 | 16 | 66.7% |
| D9 | [11, 13] | 25 | 15 | 60.0% |
| D10 (most positive gap) | [14, 29] | 24 | 19 | 79.2% |

**zlg**

| Decile | gap range (words) | n | correct | rate |
| --- | --- | ---: | ---: | ---: |
| D1 | [−44, −19] | 24 | 8 | 33.3% |
| D2 | [−19, −14] | 25 | 4 | 16.0% |
| D3 | [−14, −9] | 24 | 2 | 8.3% |
| D4 | [−9, −7] | 25 | 6 | 24.0% |
| D5 | [−7, −5] | 24 | 6 | 25.0% |
| D6 | [−5, −2] | 24 | 4 | 16.7% |
| D7 | [−2, 0] | 25 | 8 | 32.0% |
| D8 | [0, 3] | 24 | 10 | 41.7% |
| D9 | [3, 7] | 25 | 9 | 36.0% |
| D10 | [8, 25] | 24 | 12 | 50.0% |

There is a rough upward drift from D1 to D10 for both methods, but it is noisy (our method's D1 at 45.8% is *higher* than its D2/D4/D5/D7), not monotone, and the correlation coefficients above quantify just how weak this trend is (r ≈ 0.14–0.16). ZLG's drift is a bit more monotone-looking (33→16→8→24→25→17→32→42→36→50) but the correlation is nearly identical in magnitude to our method's (0.144 vs 0.156). This is the headline quantitative test the hypothesis needs to win decisively, and it does not.

## Test 5 — uniformity / variance angle

Standard deviation of the 9 human distractors' word counts per post (identical distribution across methods, n=244 posts; median sd = 24.14 words — note this sd is large because distractor length itself is highly variable, consistent with the prior note's human sd of 28.0).

Splitting at the median distractor-sd:

| Method | High-variance slate correct/n | Rate | Low-variance slate correct/n | Rate |
| --- | ---: | ---: | ---: | ---: |
| our_method | 59/122 | 48.4% | 67/122 | 54.9% |
| zlg | 26/122 | 21.3% | 43/122 | 35.2% |

Both readings, honestly reported: **detection is higher in low-variance (more uniform) distractor slates, not high-variance ones, for both methods.** This is the opposite of the "our comment looks conspicuously normal amid wild outliers" mechanism the collaborator proposed — if anything, a chaotic, high-variance slate makes the inserted comment *harder* to pick out (more noise to search through), while a uniform slate makes any oddity (of any kind, not necessarily length) easier to spot. The variance angle does not support the hypothesis in either direction tested.

## Test 6 — controlling for length (the strongest single result)

Restricting to tasks where the inserted comment's length rank is middling (rank 4–7 of 10 — i.e., it is neither among the shortest 3 nor the longest 3, so it does not stand out on length):

| Method | Correct | n | Rate | vs. unconditional rate | vs. 10% chance |
| --- | ---: | ---: | ---: | ---: | ---: |
| our_method | 87 | 178 | 48.9% | 51.6% (−2.7 pts) | +38.9 pts |
| zlg | 46 | 135 | 34.1% | 28.3% (+5.8 pts) | +24.1 pts |

**Our method's detection barely moves (51.6% → 48.9%) when length is taken off the table, and stays far above chance and ~15 points above ZLG's rate in the same length-controlled slice.** ZLG's rate under this control is if anything slightly *higher* than its unconditional rate, not lower — the opposite of what "detection is driven by length" would predict for the length-neutral subset. This is the plainest evidence in the whole analysis that length is not the main driver of J1 detection for either method, and specifically not of the our_method-vs-ZLG detection gap.

## Test 7 — judge evidence vs length language

Regex on `result.evidence`: `\b(long(er|est)?|lengthy|wordy|verbose|short(er|est)?|brief(er|est)?|terse|fragment(ed|s)?|one[- ]?liner)\b` (case-insensitive). This is a coarse lexical scan of the evidence sentence, not a re-judgment of whether length actually drove the call — several matches turn out to describe the *surrounding thread's* terseness as part of a register argument (e.g. "unlike the thread's terse, slang-heavy reactions"), not literally "this comment is too long," so these counts are an upper bound on genuine length-based reasoning.

| Method | Hits (detected) mentioning length / n hits | Rate | Misses (not detected) mentioning length / n misses | Rate |
| --- | ---: | ---: | ---: | ---: |
| our_method | 17/126 | 13.5% | 30/118 | 25.4% |
| zlg | 13/69 | 18.8% | 68/175 | 38.9% |

**Length language is roughly 2x more common in misses than in hits, for both methods.** If length were the mechanism behind correct detections, we would expect the opposite pattern (length language concentrated in hits). This is a clear point against the hypothesis, with the caveat above that many of these "misses" are the judge citing a *human* distractor's brevity/fragment-like quality as the reason for its (wrong) pick, which is a different phenomenon than "our synthetic comment got caught for being long."

5 verbatim `evidence` quotes where the judge does cite length/brevity language (from 128 total matches: 30 on hits, 98 on misses):

1. `[zlg, pair 1083, detected=True, rank 2.5/10]` — "Comment 5 is an incomplete, generic-sounding fragment with no identifiable conversational context, unlike the other comments' clear reactions or personal details."
2. `[zlg, pair 1158, detected=True, rank 7.5/10]` — "Comment 10 is malformed navigation-page text with duplicated URL fragments and irrelevant local-news links, unlike the conversational comments."
3. `[our_method, pair 1160, detected=True, rank 8.0/10]` — "Comment 5 shifts into polished, generalized analysis about culture-war organizations, unlike the thread's terse, visceral, profanity-heavy register."
4. `[our_method, pair 1011, detected=False, rank 5.0/10]` — "Comment 5 has unusually polished, textbook-like technical exposition and a generic concluding caveat, unlike the terse, sarcastic, or informal register of the surrounding thread."
5. `[zlg, pair 1021, detected=False, rank 4.0/10]` — "Comment 1 uses unusually formal, hedged policy language and a neatly structured argument that feels detached from the thread's terse, conversational exchange."

Note the pattern in quotes 3–5: "terse" is describing the *rest of the thread*, contrasted against register/polish, not asserting the flagged comment is too long. Only quotes 1–2 (both ZLG, both about malformed/fragmentary text) are genuinely about the flagged comment's own length/completeness.

## Test 8 — character-level sanity check

Repeating Test 4 with character counts instead of words (gap = inserted comment's char count minus 9-distractor median char count; n=244 per method):

| Method | Point-biserial r | Spearman ρ |
| --- | ---: | ---: |
| our_method | 0.182 | 0.211 |
| zlg | 0.215 | 0.255 |

**our_method** decile detection rates (n≈24–25 per decile):

| Decile | gap range (chars) | n | correct | rate |
| --- | --- | ---: | ---: | ---: |
| D1 | [−185, −56] | 24 | 11 | 45.8% |
| D2 | [−56, −19] | 25 | 8 | 32.0% |
| D3 | [−19, −3] | 24 | 12 | 50.0% |
| D4 | [−3, 10] | 25 | 11 | 44.0% |
| D5 | [11, 24] | 24 | 9 | 37.5% |
| D6 | [25, 35] | 24 | 13 | 54.2% |
| D7 | [35, 52] | 25 | 14 | 56.0% |
| D8 | [52, 69] | 24 | 12 | 50.0% |
| D9 | [70, 83] | 25 | 16 | 64.0% |
| D10 | [84, 143] | 24 | 20 | 83.3% |

**zlg** decile detection rates:

| Decile | gap range (chars) | n | correct | rate |
| --- | --- | ---: | ---: | ---: |
| D1 | [−249, −118] | 24 | 7 | 29.2% |
| D2 | [−116, −75] | 25 | 2 | 8.0% |
| D3 | [−74, −52] | 24 | 3 | 12.5% |
| D4 | [−52, −41] | 25 | 6 | 24.0% |
| D5 | [−40, −28] | 24 | 4 | 16.7% |
| D6 | [−28, −16] | 24 | 3 | 12.5% |
| D7 | [−15, −3] | 25 | 12 | 48.0% |
| D8 | [−2, 13] | 24 | 8 | 33.3% |
| D9 | [15, 50] | 25 | 11 | 44.0% |
| D10 | [52, 213] | 24 | 13 | 54.2% |

Switching from words to characters slightly *strengthens* the correlation for ZLG (0.144 → 0.215) and modestly for our method (0.156 → 0.182), and the ZLG decile trend looks somewhat more monotone in characters than in words. Tokenization choice is not hiding a large effect either way, but characters give a marginally cleaner (still weak, r²≈4–6%) length signal than words for ZLG specifically. This does not change the Test 6 conclusion, which controls on rank (a unit-free measure) rather than a specific gap statistic.

## What this does and does not license the spec to claim

**Does license:**
- A claim that J1 length-gap correlates weakly and positively with detection for both methods (r ≈ 0.14–0.22, Spearman ρ ≈ 0.19–0.26) — length is a real, minor contributing signal, not a null one.
- A claim that this correlation is far too weak to explain the our_method-vs-ZLG detection gap: at middling length rank (not standing out on length), our method still beats ZLG by ~15 points (48.9% vs 34.1%, Test 6), essentially unchanged from the unconditional 23.3-point gap.
- A claim that the "short human distractors inflate detection" mechanism, tested directly (Test 3), moves ZLG's detection rate by ~0 points and our method's by ~8 points — real for our method, but a second-order effect, not the main story.
- A claim that judge evidence text invoking length/brevity language is *more* associated with misses than hits for both methods (Test 7) — length-flavored language in the evidence field is not a reliable marker of a correct call.

**Does not license:**
- A claim that length/slate composition plays *no* role — Test 1, 2, 4, and 8 all show small positive correlations and a real tail effect (Test 2's rank-9–10 bucket, 80% for our method, though n=15).
- A claim about the *causal* mechanism behind why the judge picks what it picks — Test 7 is a keyword scan on `evidence` text, not a causal probe, and most "length" keyword hits describe the *surrounding thread's* terseness rather than the flagged comment's own length.
- Any claim about the human-variance/uniformity mechanism specifically — Test 5's finding that low-variance slates show *higher* detection for both methods is the opposite of the "conspicuously average amid extremes" story, so that specific proposed mechanism is not just unsupported but contradicted by the data as measured here.
- Generalization beyond this run — this is one frozen 244-post `r/news`-only comparison_dataset (`zlg_lucid_fresh_6x_20260815_independent_unique_judge`); no claim about other subreddits, other judge models, or other slate-construction rules should be drawn from these numbers.

## Limits

- Word/char counts are computed from the `numbered_comments` slate text shown to the judge (the frozen artifact the judge actually saw), not independently recomputed against `paired_rows.stegotext`; a companion note in this same `docs/docket/research/` directory (`why-j1-flags-our-method-more.md`) reports one known slate/stegotext text mismatch elsewhere in this run (ZLG post `1n8gc9j`), which was not specifically re-checked here.
- All distractor and slate statistics use whitespace `str.split()` word counts and raw `len(text)` character counts — no normalization for punctuation, emoji, or markdown, which could shift a handful of counts by 1–2 units.
- Rank and z-score treat the 10-comment slate as a fixed finite population (population sd, average rank on ties); a different tie-breaking or sample-sd convention would shift individual z-scores/ranks by small amounts without changing any of the reported n or rate figures.
- The Test 7 keyword regex is a blunt instrument (noted inline); a manual re-read of all 128 matches, or a second LLM pass classifying "is this evidence actually about length," would sharpen that test but was out of scope here.
- Correlation tests (4, 8) are simple point-biserial / Spearman on 244 points per method; no multivariate model (e.g., logistic regression jointly on rank, gap, and distractor variance) was fit, so interaction effects between the tested factors are not ruled out.
