# Why J1 flags our method more than ZLG

Question: the table’s J1 standout rates (51.6% our method vs 28.3% ZLG, lower better, chance 10%) make ZLG look much stealthier. What do the slates and `evidence` strings actually say?

Scope: frozen independent unique-ZLG judge run, 244 posts / 244 pairs, all `r/news`. Recomputed here from the JSONL; hit rates match the 2026-08-29 report and the viewer `rate(..., "inserted_index")` formula. This note quotes judge evidence and comments; it does not lock a viewer justification.

Primary sources:

- Judgments / keys / tasks: `stego-side-wing/metrics/zlg_comparison_runs/zlg_lucid_fresh_6x_20260815_independent_unique_judge/comparison_dataset/codex_judgments/standout_{judgments,answer_key,tasks}.jsonl` (488 / 488, 0 errors; `standout_progress.json`).
- Stego texts: same run’s `comparison_dataset/paired_rows.jsonl`.
- J4 join: `codex_judgments/attribution_judgments.jsonl` (`result.thread_index === answer.thread_index`).
- Prompt / schema: `stego-side-wing/config/evaluation_prompts/standout_v1.txt`, `.../schemas/standout_v1.schema.json`.
- Slate: `stego-side-wing/src/services/judge_slate_service.py` `build_standout` (same insert slot for both methods; up to 9 human distractors).
- Table / report: `stego-results-viewer/src/app/zlg-comparison/_lib/llm-judge.ts` `rate`; `stego-side-wing/docs/reports/2026-08-29-independent-llm-judge-results.md`.

Join key: `post_id` (one pair per post). `pair_id` matches across methods on all 244 posts. Slate inserted text matches `paired_rows.stegotext` on 487 / 488 tasks; the one mismatch is ZLG `1n8gc9j`, whose stored cover continues past a leaked `Comments:` header that the slate truncates.

---

## What J1 asks

The judge sees the post plus **10 numbered comments** and must name the one inserted machine comment. Returns `inserted_index` (1–10), `confidence` (0–100), `runner_up_index` (1–10), `evidence` (short sentence). Prompt: judge conversational fit, specificity, stance, register, and habits; **do not use length or polish as a cue**. Source: `standout_v1.txt`.

The table cell is how often `result.inserted_index === answer.inserted_index`. Chance is 1/10. The two methods are **separate 10-way tasks** that share the human distractors and the insert slot; they are not a head-to-head on one slate.

---

## How often each method is named

Recomputed from `standout_judgments.jsonl` (same as the report):

| Method | Correctly named | Rate | Misses | Miss, but `runner_up_index` is the inserted comment |
| --- | ---: | ---: | ---: | ---: |
| Our method | 126 / 244 | 51.6% | 118 | 33 / 118 (28.0% of misses) |
| ZLG | 69 / 244 | 28.3% | 175 | 26 / 175 (14.9% of misses) |

`runner_up_index` is never equal to the predicted index (schema treats it as a distinct alternative). If runner-up-true were counted as a soft hit, the rates would be 159 / 244 (65.2%) vs 95 / 244 (38.9%). That is not the table metric.

### Confidence

Every task returns a confidence. Means are high on both hits and misses; wrong answers are not low-confidence guesses.

| Subset | n | mean | median | p25 | p75 | 90–100 | 70–89 | 50–69 | 0–49 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Our method, hit | 126 | 83.0 | 86 | 78 | 93 | 44 | 62 | 16 | 4 |
| Our method, miss | 118 | 84.2 | 86 | 78 | 94 | 45 | 55 | 17 | 1 |
| ZLG, hit | 69 | 87.6 | 94 | 80 | 98 | 40 | 20 | 7 | 2 |
| ZLG, miss | 175 | 83.4 | 86 | 78 | 94 | 65 | 76 | 31 | 3 |

Misses where the runner-up *is* the inserted comment have similar mean confidence (our method 86.0, ZLG 84.8) to other misses.

### Same-post pairing

| Cell | n / 244 |
| --- | ---: |
| Our method hit, ZLG miss | 84 |
| Both miss | 91 |
| Both hit | 42 |
| Our method miss, ZLG hit | 27 |

On 57 / 91 both-miss posts, both tasks name the **same** human index (shared false positive). On 34 they name different humans.

---

## What the hit `evidence` strings say

Keyword tags on the 126 / 69 **correct** identifications (a sentence can take several tags). Counts are from the evidence text, not from a second judge.

| Tag (regex on `evidence`) | Our method hits (n=126) | ZLG hits (n=69) |
| --- | ---: | ---: |
| generic / vague / platitude / sweeping | 102 | 37 |
| polished / machine-like | 70 | 9 |
| lacks specificity / non-specific / abstract | 62 | 13 |
| register / slang / terse / typo / fragment | 35 | 21 |
| off-topic / does not fit / weakly tied | 16 | 9 |
| restates article / summary-like / encyclopedic | 11 | 8 |
| constructed / scripted | 2 | 2 |
| “too / overly / oddly specific” | 1 | 1 |
| malformed / JSON / survey prompt / metadata | 0 | 12 |

Top content words in our-method **hit** evidence: *generic* (82), *polished* (69), *specific* (43). Of the 48 our-method hit sentences that contain “specific,” 38 are **lack of** specificity (“without … specific detail,” “lacking the thread’s specific …”); 1 is “oddly specific”; 9 are other (usually “the thread’s specific historical discussion” as a contrast). The word *specific* in J1 hits is mostly “humans are specific, this comment is not.”

The prompt forbids using polish as a cue. The judge still writes *polished* on 70 / 126 our-method hits (and 9 / 69 ZLG hits).

ZLG hits are a mixed bag: generic/detached (37), register/malformed (21+12), plus a smaller news-summary cluster (8). About 9 / 69 ZLG hits have malformed cover text in the comment itself (JSON wrappers, survey widgets, article `key_points` fragments). Those are easy 10-way picks and are not the same tell as our-method hits.

Word count (prompt says ignore length; distributions still differ): our-method hits mean 24.5 words vs misses 22.6; ZLG hits 18.3 vs misses 15.1. J5 `overall` on the same comments is lower when J1 hits (our method 2.95 vs 3.45; ZLG 2.12 vs 3.06). J3 `suspicion` is higher when J1 hits (our method mean 39.6 vs 18.0; ZLG 51.1 vs 22.3). Source: `paired_rows.jsonl` fields written from the pointwise judges; J1/J3/J5 correlation is also in `docs/docket/research/whether-j3-is-insensitive.md`.

---

## Examples

Comments are the slate’s inserted `stegotext`. Evidence is the judge sentence for that method’s task. Characterization is of the two generated comments, not of the human distractors.

### (a) Our method caught, ZLG missed — 84 posts

**Post `1m9vtya`** — *Kentucky man wakes up during organ harvesting procedure…* Inserted at index 2.

- Our method (hit, conf 94, J4 correct): “This is terrifyingly real and proves that organ shortage debates often hide much darker truths about how these systems actually operate.” Sweeping moral thesis; no named hospital, patient, or investigation detail.
- Evidence: “Comment 2 uses vague, sensational framing and a sweeping conclusion about organ-shortage debates without engaging any specific detail from the thread.”
- ZLG (miss, conf 62, J4 correct): “They are purely run off of numbers and certifications to get the most money possible from the system.” Short generic grievance; no named entities. The judge named a long first-person transplant anecdote (index 10) instead.

**Post `1me1y3z`** — *Fema denies grants to three Kentucky counties…* Inserted at index 10.

- Our method (hit, conf 92, J4 correct): “Honestly, it feels like we're stuck in a loop where the only way to 'prepare for future disasters' is to deny funding right now.” Thread-adjacent (funding vs disasters) but packaged as a tidy irony; no county names.
- Evidence: “Comment 10 uses generic, polished “stuck in a loop” framing and neatly restates the article’s premise without the thread’s usual specific references, slang, or personal reaction.”
- ZLG (miss, conf 88, runner-up **was** the inserted comment, J4 correct): “The US government is a joke anyway and we're all better off without it.” Generic political aside that could sit in many r/news threads. The judge named a human biblical-parable comment.

**Post `1m59xin`** (same cell; minority “restates the article” tell) — *Oregon man found with guns near U.S. Capitol.* Inserted at index 9.

- Our method (hit, conf 91, J4 correct): “The article clarifies that 'nexus to the Congress' means law enforcement has found no legal link between the suspect's actions or weapons and any official congressional business.” Encyclopedic gloss of a quoted phrase; named-entity heavy relative to the other our-method examples.
- Evidence: “Comment 9 uses unusually formal, explanatory language and restates the article’s ambiguity in a detached, encyclopedic way unlike the thread’s casual, fragmented banter.”
- ZLG (miss, conf 96, J4 wrong): “I mean the word rapier comes from "sword", but that's not what the president is.” Off-register wordplay. The judge named a long human “Keep Portland Weird” anecdote.

### (b) Both caught — 42 posts

**Post `1mhqzuk`** — *Gates Foundation commits $2.5 billion to 'ignored' women's health.* Inserted at index 10.

- Our method (hit, conf 93, J4 correct): “Exactly, it feels like we are still treating female pain as a myth rather than a biological reality that needs study.” On-topic agreement; abstract/clinical diction, no dollar figure or foundation name.
- Evidence: “Comment 10 uses polished, generic agreement and abstract phrasing about female pain, unlike the thread’s more personal, sarcastic, or typo-filled comments.”
- ZLG (hit, conf 97, J4 correct): “It has a lot of tissue in it and the structure is much more complex than the glans.” Unanchored anatomy; wrong register for a funding story.
- Evidence: “Comment 10 is an unprompted, oddly clinical anatomical aside with no clear conversational connection to the article or surrounding comments.”

**Post `1mnnv15`** — *Uvalde school district will release a trove of records…* Inserted at index 5.

- Our method (hit, conf 96, J4 **wrong**): “I’m just sad to see another location marked by death; geography shouldn’t define how we treat victims or hold people accountable.” Generic condolence + geography metaphor; no Uvalde / Robb / records.
- Evidence: “Comment 5 uses generic, polished moral language and an abstract geography metaphor, lacking the specific outrage, slang, typos, or concrete references typical of the surrounding Reddit comments.”
- ZLG (hit, conf 99, J4 correct): “(Select One): Not Relevant Slightly Less Relevant Somewhat More Relevant Very Much More Relevant / This is a tragedy that will never be forgotten.” Survey-widget leak plus stock condolence.
- Evidence: “Comment 5 contains an out-of-context survey prompt and generic condolence, unlike the conversational, topical reactions in the other comments.”

(A frequent ZLG-both-hit pattern, not quoted at length: covers that leak JSON / `key_points` / headline fragments. Example: `1m349q4`, visa-integrity fee — ZLG evidence “Comment 10 is malformed JSON…”. Our method on that post is an abstract “shuffling papers” line with no visa/travel mention, also hit.)

### (c) Neither caught — 91 posts

**Post `1lw4su3`** — *Utah judge schedules execution by firing squad for a man with dementia.* Inserted at index 2. Both tasks named the **same** human (index 9).

- Our method (miss, conf 43, J4 correct): “The contrast between what Utah allows and other places is just stark to think about.” Mild, on-topic, low named-entity load (Utah only).
- ZLG (miss, conf 72, J4 correct): “And if they are convinced that it was murder, then they would vote for a life sentence in prison instead of a death sentence.” Thread-adjacent legal hypothetical; no names.
- Shared false positive (human): a technical “Hypoxic hypoxia would be the most humane method…” execution-pod elaboration.
- Our evidence: “The unusually technical, explanatory proposal for a specific execution method feels less like a natural reply and more like generated elaboration.”
- ZLG evidence: “The unusually technical, explanatory tangent about hypoxic hypoxia and execution pods feels less conversationally grounded than the other comments…”

**Post `1ms9q17`** — *Judge strikes down key parts of Florida law that led to removal of books…* Inserted at index 6. Different false positives; our-method runner-up **was** the inserted comment.

- Our method (miss, conf 78, J4 correct): “I can't help but worry about how long it will take before teachers and librarians feel safe enough to just pick up any book without checking for 'questionable' content first.” Thread-specific (teachers/librarians/books), first-person worry, no proper names.
- Evidence (about the human it named): “Comment 5 has a notably constructed, topical inference with a measured 'presumably' framing that feels less like the thread’s casual, idiosyncratic human banter.”
- ZLG (miss, conf 78, J4 correct): “It took a few centuries to build them.” Short, underspecified; could attach to libraries or many other referents.
- Evidence (about a different human): “Comment 10 has a polished, generalized causal explanation and unusually tidy argumentative structure compared with the thread’s more fragmentary, slangy, or anecdotal replies.”

---

## Which tell is it?

On **our-method detections**, the dominant evidence language is **generic LLM polish plus missing thread grit** (no slang, typos, named details, or personal stance), not “too on-topic / too constructed.”

- “Too constructed / restates the article” is a real but small cluster (11 article-summary tags, 2 constructed, 1 “oddly specific” among 126 hits). `1m59xin` and `1me1y3z` are examples; they still usually co-occur with *generic* / *polished*.
- Wrong register appears as a **contrast** (“unlike the thread’s terse, slang-heavy…”) more than as “this comment is in the wrong dialect.” Direct register tags: 35 / 126 our-method hits vs 21 / 69 ZLG hits.
- ZLG detections, when they happen, more often cite malformed covers, clinical/off-topic asides, or news-summary sentences. ZLG **misses** are frequently short generic rants or fragments that look like human asides (`1me1y3z`, `1ms9q17`).

The 10-way human distractors include long, technical, or essay-like humans. When both methods miss, the judge often spends its high confidence on one of those humans (57 / 91 shared index). That is a property of the slate, not of one method’s cover.

---

## Is this the other face of J4?

J4 on this same join: 218 / 244 (89.3%) our method vs 183 / 244 (75.0%) ZLG — matches the report. J4 is a **4-way thread-blurb** match (`attribution_v1.txt`; `build_attribution`), not a 10-way human lineup.

Cross-tab, same `post_id` / method:

| | J4 correct | J4 wrong |
| --- | ---: | ---: |
| Our method, J1 hit | 109 | 17 |
| Our method, J1 miss | 109 | 9 |
| ZLG, J1 hit | 58 | 11 |
| ZLG, J1 miss | 125 | 50 |

- Our method: J1 hit rate is **50.0%** among J4-correct comments (109 / 218) and **65.4%** among J4-wrong (17 / 26, small n). Standout **hits** are slightly *less* often J4-correct (86.5%) than standout misses (92.4%).
- ZLG: J1 hit rate is **31.7%** among J4-correct (58 / 183) vs **18.0%** among J4-wrong (11 / 61). Thread-signal and 10-way detection move together more for ZLG (malformed covers that leak article text can be both attributable and obvious).

Paired J1 cells vs J4: the 84 our-only-J1 posts are still 90.5% J4-correct for our method (near the 89.3% base rate). The 42 both-J1 posts drop to 78.6% our-method J4 — several of those our-method comments are the off-topic/abstract ones (`1mnnv15` geography metaphor, `1m349q4` “shuffling papers” with no visa fee).

What this does **not** show: that our method’s extra J1 detections are the comments J4 already marked as more thread-specific. The J1 evidence on those detections mostly says the opposite (generic, not specific enough versus the humans). What it **does** show, without choosing a viewer story: our method can be easy to attribute to the right thread (J4) and still be the odd one out among nine humans (J1) because the oddness cited is polish / abstraction / missing Reddit habits, with a smaller restatement cluster. ZLG’s lower J1 is not only “more generic so it blends”; part of the 28.3% is leftover malformed covers, and part of the 71.7% miss rate is short generic lines the 10-way judge gives to a flashier human.

---

## Limits

- All 244 posts are `r/news`. The register contrast in the evidence (“terse, slangy Reddit”) is news-comment register, not a subreddit mix.
- One LLM judge (Codex Luna, high reasoning). Evidence language is that model’s vocabulary; it cites polish after being told not to use polish as a cue.
- J1, J3, J4, J5 are different tasks on the same texts; agreement is moderate, not identity (see the J3 note).
- No human readers in this run. “Caught” means this judge named that index.
