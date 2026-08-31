# Are our method's comments reply-shaped but slotted into a flat list?

AFK research for docket ticket 05.

## Gate — recomputed J1 numbers, pass/fail, JSON paths used

Source directory: `stego-side-wing/metrics/zlg_comparison_runs/zlg_lucid_fresh_6x_20260815_independent_unique_judge/comparison_dataset/`

- `codex_judgments/standout_tasks.jsonl` — 488 rows (244 `our_method` + 244 `zlg`), each with `prompt_fields.numbered_comments` (the 10-item slate shown to the judge).
- `codex_judgments/standout_judgments.jsonl` — 488 rows, each with `answer.inserted_index`, `result.inserted_index`, `result.confidence`, `result.runner_up_index`, `result.evidence`. The inline `answer` field agrees with `standout_answer_key.jsonl` on all 488 rows (0 mismatches).
- `codex_judgments/standout_answer_key.jsonl` — 488 rows, `answer.inserted_index` (authoritative key).
- `paired_rows.jsonl` — 488 rows, one per `(pair_id, method)`, carrying `stegotext`.

Recomputed by joining on `task_id` and checking `result.inserted_index == answer.inserted_index`:

| Method | Correct | n | Rate |
| --- | ---: | ---: | ---: |
| our_method | 126 | 244 | 51.6% |
| zlg | 69 | 244 | 28.3% |

**Gate: PASS.** Matches the required 126/244 (51.6%) and 69/244 (28.3%) exactly.

Cross-check: joining the answer-key's `inserted_index` back into `numbered_comments` and diffing against `paired_rows.stegotext` for the same `(pair_id, method)` reproduces the stegotext on 488/488 rows once the parser is fixed to reject a stray in-body `"1. ..."` line inside one comment (`pair_id 1583`, `zlg`) that would otherwise be misread as a slate-item boundary — that comment's original text contains a leaked `Comments:\n1. This is a perfect example...` fragment from a different source. This is a known artifact-quality issue in that single ZLG row, not an our_method issue, and it does not change any of the counts below (it only affects text recovered for one zlg slate's item ordering).

## Verdict

**The human baseline test (Test 3) does not support the strong hypothesis. Reply-shape is common in human Reddit replies too: 34.2% (1502/4392) of human distractor comments carry at least one reply-shape marker, close to our_method's 38.5% (94/244) and actually higher than zlg's 23.0% (56/244).** If reply-shape were the thing singling out our comments in a flat list, zlg's reply-shaped inserts should also be flagged more than its non-reply-shaped inserts — instead the opposite happens (zlg: 23.2% detected when reply-shaped vs 29.8% when not, Test 2). For our_method the direction is at least consistent with the hypothesis (57.4% detected when reply-shaped vs 48.0% when not, a 9.4pp gap, n=94 vs n=150), but the human control means "carries an opener/you/demonstrative" cannot by itself be what the judge is keying on, since it can't explain why humans with the same markers aren't flagged. The sharpest, narrowest form of the hypothesis (bare demonstrative/uptake phrase with no antecedent in the slate, Test 4) shows a large effect (100% detected when no antecedent is present vs 76.9% when one is) but on n=2 vs n=13 — far too small to draw a conclusion from. Evidence-string corroboration (Test 5) is the weakest link: only 5/126 (4.0%) of our_method's correct-detection evidence strings use fit/coherence language at all, and only 2/126 (1.6%) do so without also citing the already-known generic/polished tell. **Overall: refuted as the dominant explanation for the J1 gap; a narrow, underpowered signal survives only for the sharpest sub-claim (bare demonstrative without an antecedent) and cannot be distinguished from noise at this sample size.**

## Test 1 — feature prevalence (our_method inserts vs zlg inserts vs human distractors)

n = 244 our_method inserts, 244 zlg inserts, 4392 human distractor comments (9 or 10 per 244 slates minus the 1 insert slot, minus any parse loss — see Limits).

| Feature | our_method (n=244) | zlg (n=244) | human (n=4392) |
| --- | ---: | ---: | ---: |
| (a) agreement/uptake opener | 60 (24.6%) | 8 (3.3%) | 318 (7.2%) |
| (b) second-person address | 40 (16.4%) | 22 (9.0%) | 1036 (23.6%) |
| (c) explicit uptake verb phrase | 2 (0.8%) | 0 (0.0%) | 50 (1.1%) |
| (d) bare demonstrative, no antecedent in first clause | 13 (5.3%) | 1 (0.4%) | 78 (1.8%) |
| (e) discourse continuation adverb in first 3 words | 3 (1.2%) | 27 (11.1%) | 268 (6.1%) |
| **ANY of the above** | **94 (38.5%)** | **56 (23.0%)** | **1502 (34.2%)** |

Reading this table: our_method's ANY-feature rate (38.5%) is only ~4.3pp above the human baseline (34.2%), and human comments carry second-person address (23.6%) at a *higher* rate than our_method (16.4%). Only feature (a), the agreement/uptake opener, and (d), the bare demonstrative, are clearly elevated for our_method relative to both zlg and humans. Feature (e) is actually the zlg/human-dominant feature (zlg 11.1%, human 6.1%, our_method only 1.2%) — zlg's "reply-shape" looks structurally different from our_method's (continuation fragments like "and the vaccine mandates they put in place." rather than agreement openers).

## Test 2 — detection rate by reply-shape

### ANY feature vs NONE

| Method | ANY feature: detected/n | rate | NO feature: detected/n | rate |
| --- | ---: | ---: | ---: | ---: |
| our_method | 54/94 | 57.4% | 72/150 | 48.0% |
| zlg | 13/56 | 23.2% | 56/188 | 29.8% |

our_method shows the predicted direction (+9.4pp when reply-shaped). zlg shows the **opposite** direction (−6.6pp when reply-shaped) — reply-shape does not universally raise detection risk, which weakens the claim that reply-shape itself (independent of which method produces it) is what the judge reacts to.

### Per individual feature

| Feature | our_method: has (detected/n, rate) | our_method: lacks (detected/n, rate) | zlg: has (detected/n, rate) | zlg: lacks (detected/n, rate) |
| --- | ---: | ---: | ---: | ---: |
| (a) opener | 38/60, 63.3% | 88/184, 47.8% | 3/8, 37.5% | 66/236, 28.0% |
| (b) second-person | 22/40, 55.0% | 104/204, 51.0% | 2/22, 9.1% | 67/222, 30.2% |
| (c) uptake phrase | 1/2, 50.0% | 125/242, 51.7% | 0/0, n/a | 69/244, 28.3% |
| (d) bare demonstrative | 11/13, 84.6% | 115/231, 49.8% | 0/1, 0.0% | 69/243, 28.4% |
| (e) continuation adverb | 1/3, 33.3% | 125/241, 51.9% | 8/27, 29.6% | 61/217, 28.1% |

(d) bare demonstrative is the only feature with a large, consistent gap for our_method (84.6% vs the 51.6% overall baseline), but n=13 is small. (b) second-person shows almost no effect for our_method (55.0% vs 51.0%) despite being the most frequent feature — and it *reduces* detection for zlg (9.1% vs 30.2%), the opposite of the hypothesis.

## Test 3 — THE CRITICAL CONTROL: human baseline

| Group | n | ANY reply-shape feature |
| --- | ---: | ---: |
| our_method inserts | 244 | 94 (38.5%) |
| zlg inserts | 244 | 56 (23.0%) |
| **human distractors (all slates)** | **4392** | **1502 (34.2%)** |

**This is the decisive test and it substantially weakens the hypothesis.** Humans reply to each other constantly, and it shows: over a third of human distractor comments in these same slates carry an agreement opener, second-person address, uptake phrase, bare demonstrative, or continuation adverb — a rate within 4.3 points of our_method's 38.5% and *above* zlg's 23.0%. If reply-shape alone explained why the judge singles out a comment in a flat list, human comments with the same markers should be misidentified as "the machine one" far more than they apparently are (they are the 9 comments the judge does *not* pick on the 126/69 hit rows, and they are also present, unflagged, on essentially every slate). Reply-shape is not a rare or exotic property of our method's output; it is a normal feature of Reddit reply prose in general. The hypothesis is **not fully dead** — our_method still shows a modestly elevated rate and a within-method detection bump (Test 2) — but the plain-language conclusion is that reply-shape by itself is a weak, partial signal, not the primary driver of the 51.6% vs 28.3% gap.

## Test 4 — antecedent availability

Method: for every inserted comment carrying feature (d) bare demonstrative or (c) uptake phrase, take its opening clause (up to the first `.`/`!`/`?`/`,`), extract content words (alphabetic tokens, length > 2, minus a small stopword list), and check for ≥1 shared content word with any other (human) comment in the same 10-item slate. This is a crude lexical-overlap heuristic, not semantic entailment — it will both over-count coincidental word overlap and under-count antecedents expressed with different vocabulary.

| Method | Marked (demonstrative or uptake), n | Antecedent PRESENT: detected/n, rate | Antecedent ABSENT: detected/n, rate |
| --- | ---: | ---: | ---: |
| our_method | 15 | 10/13, 76.9% | 2/2, 100.0% |
| zlg | 1 | 0/1, 0.0% | 0/0, n/a |

Directionally consistent with the sharpest form of the hypothesis (no antecedent → higher detection: 100% vs 76.9%), but **n=2 for the "absent" cell makes this statistically meaningless** — a single flip would erase the gap. zlg has only 1 marked comment total, so no comparison is possible there. This test cannot currently be run at a sample size that would let it confirm or refute anything on its own.

## Test 5 — evidence-string corroboration

Searched `result.evidence` on **correct** detections only, for the exact phrases specified: "not responding to", "no clear connection", "unprompted", "out of context", "does not engage", "addresses no one", "non sequitur", "unrelated to the other comments", "free-floating", "conversational connection". Separately flagged the already-known dominant tells with: "generic", "polished", "lacking specificit(y)", "specificity", "vague", "detached", "abstract".

| Method | Correct detections, n | Fit/coherence-phrase hits | Generic/polished-phrase hits | Fit-phrase hits with NO generic/polished overlap |
| --- | ---: | ---: | ---: | ---: |
| our_method | 126 | 5 (4.0%) | 119 (94.4%) | 2 (1.6%) |
| zlg | 69 | 3 (4.3%) | 42 (60.9%) | 2 (2.9%) |

Once overlap with the generic/polished cluster is excluded, this specific "doesn't fit the conversation" phrasing accounts for only **2 of our_method's 126 hits (1.6%)** — a small fraction of an already-documented dominant tell (generic/polished language covers 119/126, 94.4%, of the same hits).

8 verbatim examples (our_method fit-phrase hits — there are only 5 total for our_method; zlg's 3 are also shown for comparison since the required count of 8 could not be reached from our_method alone without repeating):

our_method:
1. pair_id 1082 — "Comment 1 is an unrelated, promotional-sounding fact about another local news story and **does not engage** with the kidnapping discussion."
2. pair_id 389 — "Comment 9 is a vague, polished-sounding aside about footage and children needing intensive care, with **no clear connection** to the article's subject or surrounding discussion."
3. pair_id 566 — "Comment 3 introduces an oddly specific Huron/depot historical analogy and polished metaphor that **does not engage** naturally with the thread, unlike the direct, fragmented reactions from the other commenters."
4. pair_id 676 — "Comment 6 is unusually abstract and non-specific, with a polished, therapeutic-sounding observation that **does not engage** any concrete detail from the article or surrounding debate."
5. pair_id 854 — "Comment 10 abruptly shifts to India's creator economy and Hindi-language reach, with **no conversational connection** to the L'Oreal/OnlyFans discussion."

zlg (for comparison, not counted toward our_method's share):
6. pair_id 1161 — "Comment 6 is an incomplete, generic condolence with awkward phrasing and **no clear conversational connection**, unlike the specific reactions surrounding it."
7. pair_id 768 — "Comment 10 is an **unprompted**, oddly clinical anatomical aside with **no clear conversational connection** to the article or surrounding comments."
8. pair_id 852 — "Comment 1 is a conspicuous **non sequitur** with awkward, factually dubious phrasing about building Houston and Cape Canaveral, unlike the others' recognizable reactions or replies."

Only our_method examples 1–5 count toward the 5/126 = 4.0% figure above; note that 3 of those 5 (examples 1, 3, 4) also use "polished"/"abstract"/"non-specific" language and so are already inside the generic/polished cluster — leaving only 2 (examples 2 and 5) as evidence-text hits that are *exclusively* about fit/connection rather than genericness.

## Test 6 — cross-check against J4

`codex_judgments/attribution_judgments.jsonl` + `attribution_answer_key.jsonl`, joined to the standout records on `(pair_id, method, post_id)` — 244/244 our_method rows joined successfully.

| J4 metric | Value |
| --- | --- |
| J4 our_method correct | 218/244 reported in the ticket; recomputed here as 202/244 (82.8%) — see note below |

Note: the recomputed J4 rate (202/244, 82.8%) differs from the ticket's stated 218/244. This report only needed a *within-our_method* split by J4 correctness for the reply-shape cross-tab, so the discrepancy does not affect the cross-tab conclusion below, but it is flagged here rather than silently reconciled — see Limits.

| Group | n | reply-shape ANY |
| --- | ---: | ---: |
| J4-correct our_method | 202 | 82 (40.6%) |
| J4-wrong our_method | 42 | 12 (28.6%) |

Reply-shape rate is *higher*, not lower, among J4-correct comments (40.6% vs 28.6%). This is compatible with the proposed reconciliation: a comment can be strongly bound to its **thread's content** (higher J4 success, because reply/uptake language like "Exactly," "you," "this misconception" tracks specific topical material from the thread) while still being **stranded from a specific parent** in the flat J1 list (no adjacent comment to visibly answer). The data does not contradict that reconciliation, but it is also not a strong confirmation — the gap (40.6% vs 28.6%, n=202 vs n=42) is consistent with several explanations (e.g., reply-shaped comments may simply be longer or more topically specific in ways that help both attribution and, independently, invite scrutiny in J1).

## Feature definitions

All matching is on the inserted (or distractor) comment's raw text, case-insensitive where noted.

```python
OPENER_WORDS = ["Exactly", "Agreed", "This", "That", "Yeah", "Yep", "Right",
                "True", "Same", "Honestly", "Fair", "Absolutely"]
OPENER_RE = re.compile(r"^\s*(" + "|".join(OPENER_WORDS) + r")\b,?", re.IGNORECASE)
# (a) matches if OPENER_RE.match(text) is truthy — anchored at start of string.

SECOND_PERSON_RE = re.compile(r"\b(you|your|you're)\b", re.IGNORECASE)
# (b) matches if SECOND_PERSON_RE.search(text) is truthy — anywhere in the comment.

UPTAKE_PHRASES = ["you pointing out", "you said", "your point", "as you",
                   "you mentioned", "thanks for", "i appreciate"]
# (c) matches if any phrase is a case-insensitive substring of the comment.

DEMONSTRATIVE_RE = re.compile(r"^\s*(This|That|These|Those)\s+([A-Za-z']+)")
COPULA_AUX = {"is","was","are","were","isn't","wasn't","aren't","weren't","can",
              "could","would","will","has","have","had","does","did","'s"}
# (d) matches if DEMONSTRATIVE_RE matches at the START of the comment AND the
# word immediately following the demonstrative is NOT in COPULA_AUX (i.e. the
# demonstrative is followed by a noun/adjective, not a copula/auxiliary verb —
# "This misconception ..." matches; "This is ..." does not).

CONT_ADVERBS = ["also", "plus", "and", "but", "though", "however", "still", "exactly"]
# (e) matches if any of the first 3 whitespace/punctuation-tokenized words of
# the comment (case-insensitive) is in CONT_ADVERBS.
```

"ANY" = logical OR of (a)–(e). Feature (a) and (d) can both fire on the same "This ..." opener (e.g. "This is straight-up Nazi shit" fires (a) only, since "is" is a copula; "This misconception ..." fires both (a) and (d)) — they are reported independently per the ticket, so no double-counting adjustment is made to the per-feature rows, only to "ANY".

Numbered-comment parsing: `numbered_comments` is a `"N. text\n"`-joined string. Comments are recovered with `re.compile(r"(?m)^(\d{1,2})\.\s(.*)$")`, keeping only matches that continue the strictly increasing 1..10 sequence (this rejects a stray in-body `"1. ..."` line inside one zlg comment that would otherwise be mistaken for a new slate item — see Gate section).

Human-baseline stopword list (for Test 4's content-word overlap only): a short list of ~60 function words (articles, pronouns, common auxiliaries/modals) — words of length ≤2 are also dropped.

## Hand-check of 20 random classifications

20 (method, inserted-comment) pairs were sampled (`random.seed(7)`) and each feature call was checked by hand against the quoted text.

Mechanically, all 20 rule applications matched what the regex/rule definitions say (20/20) — the code does what it claims to do. Judged **semantically** (does the flagged feature actually look like discourse deixis pointing at a missing antecedent, versus an incidental match), agreement drops to roughly **16/20 (80%)**. The four disagreements were:

- "It takes a lot of courage ... when **you're** living next to people who threatened executions." — flagged (b) second-person, but "you" here is a generic/indefinite "one," not an addressee-directed uptake marker.
- "If **you** think about the history of genetic engineering ..." — same generic-"you" issue.
- "**It also has** the highest infant death rates of any developed country." — flagged (e) continuation adverb, but "also" here reads as an ordinary additive clause about an already-established subject, not a floating reply fragment.
- "**She also said** that the agency would not hire any additional staff ..." — borderline; "also" continues an enumeration but the subject ("She") is self-contained, not obviously missing an antecedent.

The main error mode is that (b) second-person catches generic/indefinite "you" as readily as addressee-directed "you," and (e) continuation-adverb catches ordinary additive "also"/"and" as readily as a genuinely floating fragment. This ~20% false-positive-by-inspection rate should be treated as the working error rate of the classifier when reading "ANY feature" as a proxy for "genuinely reply-shaped."

## What the spec may and may not claim from this

**May claim:**
- Our method's inserted comments carry agreement-opener (a) and bare-demonstrative (d) markers at a higher rate than both zlg and human distractors, and these two features (unlike (b), (c), (e)) point in the direction the hypothesis predicts.
- Within our_method only, comments with any reply-shape marker are detected somewhat more often than those without (57.4% vs 48.0%, n=94/150).
- The bare-demonstrative-without-antecedent sub-case shows the largest gap in the whole analysis (Test 4), and is the closest this dataset gets to confirming the sharp version of the hypothesis — but is underpowered (n=13/n=2) and should not be reported as confirmed.
- Reply-shape rate is compatible with, and does not refute, the proposed J1/J4 reconciliation (thread-bound but parent-stranded), though the data do not independently prove that mechanism either.

**May not claim:**
- That reply-shape is a rare or distinctive trait of our_method's output — it is not; humans hit 34.2%, only ~4pt below our_method's 38.5%.
- That reply-shape is *the* explanation for the 51.6%/28.3% J1 gap — the evidence-string data (Test 5) shows the judges' own stated reasoning is overwhelmingly about genericness/polish (94.4% of correct our_method hits), not about conversational fit/connection (4.0%, and only 1.6% once generic/polished overlap is excluded).
- That reply-shape "causes" detection in general — the zlg data shows the opposite correlation (reply-shaped zlg inserts are detected *less* often than non-reply-shaped ones), so reply-shape cannot be a universal detection trigger; at most it may be one weak contributor specific to how our_method's comments are shaped.

## Limits

- Regex-based discourse classification is crude by design (per the ticket) and the hand-check above found roughly 1-in-5 flagged instances arguable on inspection, concentrated in features (b) and (e).
- Test 4's antecedent-overlap heuristic is a lexical bag-of-words overlap check, not a semantic or coreference check; it will miss antecedents phrased with different vocabulary and can find spurious overlap on common topic words. Its n (15 marked comments total, only 2 in the "antecedent absent" cell) is too small to support a confident conclusion either way.
- Test 6's recomputed J4 rate (202/244, 82.8%) does not match the ticket's stated 218/244. Both figures come from the same `attribution_judgments.jsonl`/`attribution_answer_key.jsonl` pair scoped to `method == "our_method"`; the discrepancy was not tracked down further since it does not change the within-our_method reply-shape-vs-J4-correctness comparison this ticket asked for, but any downstream claim citing "218/244" for J4 should be re-verified independently before being repeated in the paper.
- The evidence-string phrase list in Test 5 is an exact-substring, case-insensitive match on a fixed phrase set specified by the ticket; a broader net (e.g. "off-topic," "weakly tied," "doesn't fit") would likely raise the count somewhat, but was intentionally not added here to keep the test reproducible against the literal spec.
- One zlg row (`pair_id 1583`) has a data-quality artifact (a leaked `"Comments:\n1. ..."` fragment embedded in one slate item's text) that required a parser fix (accept only the strictly increasing 1..10 sequence) to avoid corrupting comment-index assignment; this affected only that one row's item boundaries and not any of the reported counts materially (it is a zlg-side artifact, not an our_method artifact).
- All counts are from this single frozen run (`zlg_lucid_fresh_6x_20260815_independent_unique_judge`); no attempt was made to reproduce these features/rates on any other comparison run.
