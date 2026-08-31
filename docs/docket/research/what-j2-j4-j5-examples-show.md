# What J2, J4, and J5 examples actually show

Primary sources: the 244-post independent judge run
`stego-side-wing/metrics/zlg_comparison_runs/zlg_lucid_fresh_6x_20260815_independent_unique_judge/comparison_dataset/`
(`codex_judgments/weak_link_*.jsonl`, `attribution_*.jsonl`, `register_*.jsonl`; `codex_judge_summary.json`).
Prompts: `stego-side-wing/config/evaluation_prompts/{weak_link,attribution,register}_v1.txt`.
Slate construction: `stego-side-wing/src/services/judge_slate_service.py`.
Post-cluster sign-test: `stego-side-wing/src/services/judge_scoring_service.py` (`post_cluster_summary`).
Published table numbers cross-checked against `stego-side-wing/docs/reports/2026-08-29-independent-llm-judge-results.md`.

All counts below are from the JSONL, not from the report. This note quotes judge evidence and comments; it does not lock a viewer justification.

---

## J2 weak-link

**Task.** Given the post plus five human comments, rank three unlabeled replies (one human control, our method, ZLG) from most to least human-plausible and name the weakest (`weak_link_v1.txt`; 3-way shuffle in `build_weak_link`).

| Named weakest | n / 244 | % |
| --- | ---: | ---: |
| Human control | 57 | 23.4 |
| Our method | 71 | 29.1 |
| ZLG | 116 | 47.5 |

Chance is 1/3. Mean rank (1 = strongest): human 1.795, our method 1.947, ZLG 2.258. The human control is named weakest less often than either generated comment, and less often than chance.

When ZLG is named weakest (116 tasks), the judge’s evidence most often calls the ZLG reply **generic** (39), **awkward** (27), **vague** (24), or a **fragment** (17). When our method is named weakest (71), the dominant words flip to **polished** (31 vs 13 for ZLG) and **generic** (30), plus **abstract** (10 vs 0). “Weakest” is not the same failure in both directions.

### Win (ZLG named weakest)

Post `1mp2r91` — *US national debt reaches a record thirty-seven trillion…* Ranking: human > our method > ZLG.

- Human: “that was a tough thing to see.”
- Our method: “It feels a bit like we are just picking up trillions of dollars off the ground without asking if we can actually afford to keep them.”
- ZLG: “This is an alarming rate of expansion compared to historical norms.”
- Evidence: “Reply 3 is a natural, casual reaction; reply 1 uses a plausible human metaphor, while reply 2 is generic and polished in an AI-like way.”

Post `1mqixam` — *Man fleeing Home Depot immigration raid is hit and killed…* Ranking: human > our method > ZLG.

- Human: “A) you don’t know his immigration status B) he ran because he was afraid of being detained by ICE…”
- Our method: “Makes me wonder just how much law enforcement influence shapes how transit safety gets enforced in these high-tension moments.”
- ZLG: “It’s not that hard to follow it either if your heart is right with God.”
- Evidence: “Reply 2 has natural emotional specificity, reply 1 is generic but contextually plausible, and reply 3 is a conspicuous non sequitur.”

### Loss (our method named weakest)

Post `1moxmux` — *Youths buried in Anglo-Saxon cemeteries carried West African DNA.* Ranking: ZLG > human > our method.

- Our method: “I really appreciate you pointing out that misconception about the Windrush generation being the first contact, because ignoring the long history of trade and migration just to fit a modern narrative is exactly the kind of bias we need to watch out for here.”
- ZLG: “So the grandparents could've easily been on the trade routes, and the parents could've easily been on the ship that came to the UK.”
- Human: a link plus “I hope historians really don’t expect human behavior to be that different over time.”
- Evidence: “Reply 1 is unusually polished and agenda-framed, while 2 and 3 read like natural, contextually relevant Reddit comments.”

Post `1lqu69t` — *First immigration detainees arrive at Florida center in the Everglades.* Ranking: ZLG > human > our method.

- ZLG: “He told them to leave and if not they'd be killed.”
- Human: a long Constitution / “Gestapos” rant.
- Our method: “It feels like we are just spinning wheels by assuming opposition inevitably creates enemies without looking at the actual outcomes of these policies.”
- Evidence: “Reply 1 is terse and conversational; reply 2 is rhetorically grandiose but plausibly human, while reply 3 uses vague, polished abstraction and does not clearly engage the thread.”

### Close call / human named weakest

Post `1mpltgc` — sandwich-throwing CBP story. Ranking: our method > ZLG > human. The control loses because it is a slogan fragment, not because the generated replies are especially strong.

- Human: `"local hero throws sandwich"`
- ZLG: “I mean seriously what kind of job is that if your not even allowed to touch a guy.”
- Our method: “That guy really tried to flee after throwing the sandwich instead of just standing there taking a beating.”
- Evidence: “Reply 3 is specific and conversational, while reply 1 is a generic slogan-like fragment with little engagement.”

Human-weakest cases like this (and `1mq4hx5`, where the human is an unexplained World War non sequitur) are why 23.4% is not a floor of “the judge never mistakes a real comment.” The control is a random thread comment, including fragments.

---

## J4 thread attribution

**Task.** Given one unlabeled comment and four thread blurbs, pick which thread it belongs to (`attribution_v1.txt`; 4-way slate in `build_attribution`, chance 25%).

| Method | Correct | Accuracy |
| --- | ---: | ---: |
| Our method | 218 / 244 | 89.3% |
| Human control | 184 / 244 | 75.4% |
| ZLG | 183 / 244 | 75.0% |

`codex_judge_summary.json` reports only our method vs ZLG. The human rate is in `attribution_judgments.jsonl` (`method: "human"`). ZLG sits on the human control; our method is above it. The 2026-08-29 report treats this gap as **descriptive** (no paired post-cluster test in the summary).

**Same-subreddit slates: 244 / 244.** `build_attribution` prefers three same-subreddit distractors whenever the pool has at least three. In this run every slate is four `r/news` titles. Zero correct-attribution evidence strings mention a subreddit. Generic subreddit cues cannot explain the accuracy numbers.

On the same 244 posts: both methods correct 166; ZLG miss / our-method hit 52; our-method miss / ZLG hit 17; both miss 9.

**What the evidence actually uses.** Among our-method hits, 68 / 218 (31.2%) share a 4+ letter title token with the true title; ZLG hits 54 / 183 (29.5%). Roughly half of hits are tagged “named or specific” from the evidence wording (112 / 218 our method, 88 / 183 ZLG). Angle-leftover language in the evidence is rare (4 our-method hits mention Windrush-style framing; 0 ZLG). The remaining hits are topical paraphrase without title overlap (“family ignored by the system,” “trillions of dollars”). Correct attribution here is mostly **thread-specific topical match**, not subreddit identity and not leaked angle labels.

### Same post: ZLG miss, our-method hit

Post `1lqu69t` — true thread: Everglades detention center. Slate also includes the Honduras ICE-children story, the debt story, and the Anglo-Saxon DNA story.

- Our method (correct, confidence 88): “It feels like we are just spinning wheels by assuming opposition inevitably creates enemies without looking at the actual outcomes of these policies.” Evidence: “The comment directly addresses opposition to immigration enforcement policies and questions their real-world outcomes, matching debate over the Everglades detention center.”
- ZLG (wrong, confidence 68): “He told them to leave and if not they'd be killed.” Evidence: “The comment most plausibly refers to a deported family’s account of being threatened, fitting the Honduras deportation story.”

Post `1mqixam` — true thread: Home Depot raid / freeway death.

- Our method (correct, 85): “Makes me wonder just how much law enforcement influence shapes how transit safety gets enforced in these high-tension moments.” Evidence: “The comment focuses on law enforcement influence and safety enforcement during a tense ICE raid, directly matching the fatal freeway incident.”
- ZLG (wrong, 94): “It’s not that hard to follow it either if your heart is right with God.” Evidence: “The comment’s explicit reference to being right with God fits the discussion about a church’s religiously framed civil-disobedience campaign.”

The ZLG misses are short, under-specified fragments. The judge then binds a single lexical hook (`killed`, `God`) onto a different same-subreddit title. Our-method hits on the same posts are still generic, but they name the **situation type** (policy opposition, transit/enforcement) rather than a stray entity.

### Win (named-entity / story-specific)

Post `1moxmux` — Anglo-Saxon DNA. Our method (correct, 98): the Windrush comment quoted under J2. Evidence: “The comment discusses the long history of African migration and challenges the idea that Windrush was the first contact, directly relating to West African DNA in Anglo-Saxon cemeteries.” The same “agenda-framed” leftover that J2 punished is usable thread glue for J4. ZLG also hits this post (99) via “trade routes” / “ship that came to the UK.”

Post `1mqwo1e` — Stanford legacy admissions. Our method (correct, 99): “I'm confused by this trade-off; aren't academic and financial aid disbursements supposed to be the priority when you cut off public funding?” Evidence: “The comment directly discusses Stanford withdrawing from state financial aid to preserve legacy admissions preferences.” ZLG on the same post (wrong, 65): “They simply stopped giving money for them to happen at the state schools.” Evidence maps “state schools” onto the James Dobson / Focus on the Family obituary.

### Loss

Post `1lqujx2` — elephant kills tourists. Our method (wrong, 72): “People are trying to make sense of this tragedy by blaming nationality, yet I feel like we're really just projecting our own fears onto a situation that happened far away.” Evidence assigns it to the Home Depot raid because of “nationality,” not the Zambian park story.

### Close call

Post `1mr8qcq`. True title: *A New Zealand mother and her 6-year-old son made a brief trip to Canada. They have spent weeks detained by ICE.* Our method (scored wrong, 88) chose a near-duplicate slate title: *New Zealand woman and six-year-old son detained for three weeks by Ice in US…* Candidate: “That's the reality for many families right now in Washington State—we're just waiting for the situation to change so we can go home.” This is a slate collision (two write-ups of the same incident), not a jump to an unrelated topic. Post `1mq4lza` is the opposite close miss: a fully generic “stuck in their lanes / regional stuff” comment, confidence 58, assigned to an intelligence-staff-cut story.

---

## J5 register

**Task.** Score one comment’s style against five genuine comments from the same subreddit on tone/formality, length, mechanics, insider knowledge, and overall 1–5 (`register_v1.txt`; pointwise `build_register` / `build_pointwise`). Higher is better.

| Method | Mean overall | Median | n |
| --- | ---: | ---: | ---: |
| Human control | 3.402 | 4 | 244 |
| Our method | 3.193 | 3 | 244 |
| ZLG | 2.791 | 3 | 244 |

The human-anchor mean is **not** in `codex_judge_summary.json` (that file only stores the our-minus-ZLG post-cluster block). It is in `register_judgments.jsonl` (`method: "human"`, `result.overall`). Our method sits 0.209 below the human control; ZLG sits 0.611 below it. Subscore means from the same file:

| | tone_formality | length_norm | mechanics | insider_knowledge | overall |
| --- | ---: | ---: | ---: | ---: | ---: |
| Human | 3.520 | 3.475 | 3.971 | 2.766 | 3.402 |
| Our method | 3.369 | 3.504 | 4.795 | 2.520 | 3.193 |
| ZLG | 2.992 | 3.193 | 4.164 | 2.053 | 2.791 |

Our method’s mechanics mean is *above* the human control. The gap versus ZLG is larger on insider_knowledge and tone than on mechanics.

**0.402 post-cluster gap.** `codex_judge_summary.json` → `register.post_cluster`: `our_minus_zlg_post_cluster_mean` = 0.4016… on 244 independent posts; **106 wins / 67 losses / 71 ties**; two-sided sign-test **p = 0.00374**. That test is implemented in `judge_scoring_service.post_cluster_summary` as a paired sign test on per-post mean(our) − mean(ZLG). Among J2/J4/J5, **only J5 has an inferential paired test in the scoring artifact**; J2 and J4 table gaps are descriptive. Overall score 1: ZLG 46, human 16, our method 13. Overall score 5: human 29, our method 12, ZLG 5.

### Win (large positive delta)

Post `1mr0g5z` — Mercator map. Overall: our method 5, ZLG 1, human 3.

- Our method: “I never would've guessed we'd actually be swapping out the Mercator map in 2025, feels like a huge shift.” Evidence: “Concise, natural, conversational reaction with relevant map-projection knowledge and clean mechanics.”
- ZLG: “The African Union has joined calls for a new global mapping system that reflects actual landmasses.” Evidence: “Polished, formal news-style wording lacks the comments’ casual, conversational map- or xkcd-focused style.”

Post `1mw6fp0` — FTC / LA Fitness. Overall: our method 5, ZLG 1, human 3.

- Our method: “I was so relieved to see the FTC step in because honestly, finding a manager at LA Fitness is a nightmare that no one talks about.”
- ZLG: `Continue with Facebook Continue with Twitter [![Image](https://assets.apnews.come/19/66/…` (page chrome). Evidence: “This is unrelated website boilerplate with a malformed image link, not a natural r/news comment.”

The 0.4 mean is not only “slightly more Reddit-like.” A slice of ZLG outputs are non-comments (boilerplate, fragments). Those 1s pull the cluster mean down.

### Loss (ZLG higher)

Post `1mjq91r` — SNAP junk-food rules. Overall: our method 2, ZLG 5, human 5.

- Our method: “It's easy to think just cutting out soda fixes everything, but we really need consumers to understand that the Nova system shows it's the heavy industrial processing itself—not just sugar or salt—that hurts us.” Evidence: “Clear, polished, and explanatory with clean mechanics, but it lacks the slang, profanity, typos, and polarized tone typical of these comments.”
- ZLG: “Then they're mad if it's a cart full of pop or candy.” Evidence: “Brief, colloquial, grammatically clean, and matches the sardonic political-comment style.”

### Close call (1-point gap)

Post `1moxmux` — Anglo-Saxon DNA. Overall: our method 3, ZLG 4, human 3. Same Windrush comment J2 called agenda-framed. Register evidence: “Clear and plausible, but more polished and meta-commentary-oriented than the casual, profanity-heavy examples.” ZLG: “Casual, speculative Reddit phrasing with clean mechanics and a concise length, though less detailed than most examples.”

Post `1mqwo1e` — Stanford. Overall: our method 4, ZLG 3, human 4. Our method: “A concise, polished, context-aware question that fits r/news, though it is slightly more formal and less snarky than the examples.” ZLG: “Concise and plausible for r/news, but the vague ‘them’ and slightly awkward phrasing make it less natural.”

Tie example, post `1mphfuh` (both 3, human 4): our method “more measured and abstract”; ZLG “milder, more generic, and cleaner than the examples”; human (“My mom literally said this should be celebrated…”) “informal, emotionally charged.”

---

## Cross-criterion on the same comments

Three comments recur and split by criterion:

| Comment | J2 | J4 | J5 |
| --- | --- | --- | --- |
| Windrush / Anglo-Saxon (`1moxmux`, our method) | Weakest (polished, agenda-framed) | Hit (98): African-migration glue | 3 vs ZLG 4 |
| “Spinning wheels” / Everglades (`1lqu69t`, our method) | Weakest (vague polished abstraction) | Hit (88) vs ZLG miss | 2; ZLG 4 on the terse threat fragment |
| “Heart is right with God” (`1mqixam`, ZLG) | Weakest (non sequitur) | Confident miss (94) onto a church story | 1 |

J2 and J5 punish polish and reward terse colloquial fragments; J4 rewards any recoverable thread hook, including leftover named entities. The table “wins” are not one story.

## Limits

- Judge is Codex Luna on fixed text, not a reader study (`2026-08-29` report).
- Unique-ZLG-cover subset (244 posts), not the 1,608-pair pool.
- J4 distractors are same-subreddit news titles; some slates include near-duplicate write-ups of one incident.
- J5 human mean 3.40 is itself a model score of held-out human comments against other human comments, not a human rating of humans.
