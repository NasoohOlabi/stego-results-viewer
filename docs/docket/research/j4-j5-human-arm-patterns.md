# Why our method beats humans at J4 and loses to them at J5

AFK research for docket ticket 08.

## Gate — reproduced numbers, pass/fail, exact JSON paths used

Data source (all paths relative to
`d:\Master\code\stego\stego-side-wing\metrics\zlg_comparison_runs\zlg_lucid_fresh_6x_20260815_independent_unique_judge\comparison_dataset\`):

- `codex_judgments\attribution_judgments.jsonl` (J4, 732 rows = 244 `our_method` + 244 `zlg` + 244 `human`)
- `codex_judgments\register_judgments.jsonl` (J5, 732 rows = 244 `our_method` + 244 `zlg` + 244 `human`)
- `paired_rows.jsonl` (488 rows = 244 `our_method` + 244 `zlg`; no human arm in this file)
- `codex_judge_summary.json` (aggregate cross-check)

**Method used:** for J4, each row's own embedded `answer.thread_index` was compared against that
same row's `result.thread_index` — no join against `attribution_answer_key.jsonl` was performed
(per the instructions, that key disagrees with 51/732 embedded answers and produces the wrong,
higher numbers). For J5, means were taken directly over `result.<field>` per `method`.

Reproduced numbers:

| Metric | our_method | zlg | human |
|---|---|---|---|
| J4 accuracy | 218/244 = 89.3% | 183/244 = 75.0% | 184/244 = 75.4% |
| J5 mean overall | 3.193 (n=244) | 2.791 (n=244) | 3.402 (n=244) |
| J5 mean mechanics | 4.795 (n=244) | 4.164 (n=244) | 3.971 (n=244) |
| J5 mean insider_knowledge | 2.520 (n=244) | 2.053 (n=244) | 2.766 (n=244) |

All four target numbers match the brief exactly (89.3%, 75.0%, 75.4%, 3.402, 3.193, 2.791, 3.971,
4.795, 4.164, 2.766, 2.520, 2.053). **Gate passes.** Proceeding to the three surprises.

## Surprise A — more attributable than humans

J4 shows the judge one candidate comment plus four thread title/snippet blurbs and asks which
thread the comment came from. `our_method` is attributed correctly 218/244 times (89.3%); real
human comments from the very same threads are attributed correctly only 184/244 times (75.4%),
worse than `our_method` and statistically indistinguishable from the `zlg` baseline (183/244,
75.0%).

**Quantified pattern — content-word overlap with the true thread's title is the dominant
predictor of a correct call, independent of arm:**

| Arm | n | mean topic-word overlap (correct rows) | mean topic-word overlap (incorrect rows) | zero-overlap rate, incorrect rows |
|---|---|---|---|---|
| human | 244 | 0.533 (n=184) | 0.017 (n=60) | 98.3% (59/60) |
| our_method | 244 | 0.450 (n=218) | 0.154 (n=26) | 84.6% (22/26) |
| zlg | 244 | 0.503 (n=183) | 0.049 (n=61) | 95.1% (58/61) |

(Overlap = count of shared non-stopword content words, length > 2 chars, between the candidate
comment and the true thread's title.) In every arm, wrong attributions correlate with near-zero
lexical overlap with the true title — but humans have 60 such misses vs. our method's 26, because
humans write far more zero-signal fragments in the first place.

Other measured rates, whole-sample (not split by correct/incorrect):

| Arm | n | mean word count | mean topic overlap w/ true title | share with ≤2 content words ("pure reaction") |
|---|---|---|---|---|
| human | 244 | 27.4 | 0.406 | 4.1% (10/244) |
| our_method | 244 | 23.4 | 0.418 | 0.4% (1/244) |
| zlg | 244 | 15.3 | 0.389 | 0.4% (1/244) |

Human comments are not shorter on average than our method's (27.4 vs 23.4 words) — length itself
isn't the driver. What differs is *how often the words carry no topical signal at all*: 10/244
human comments are pure reactions with two or fewer content words, ten times the rate of either
generated arm.

**What the 60 wrong human comments look like.** Ten verbatim examples (post_id / pair_id / true
title / what the judge picked instead):

1. `1mqwo1e` / pair 1010 — true title *"California Banned Legacy Admissions at Private Schools.
   Stanford Is Sticking With It"*. Candidate: `'Or marijuana and drug laws'` — a bare
   reply-to-reply fragment; judge picked the Focus on the Family obituary thread instead.
2. `1lws1jl` / pair 204 — true title *"'Very uncertain': NH man denied reentry to U.S. after
   family trip to Canada"*. Candidate: `'Yeah, I have no sympathy'` — pure reaction with zero
   content words; judge picked a murder-charge thread instead.
3. `1lp4urj` / pair 24 — true title *"Disney cruise ship rescue team saves girl who fell overboard
   and father who jumped after her"*. Candidate: `'Yes, that's exactly what that comment said'` —
   meta-comment about another comment, carries no topic signal; judge picked the ChatGPT-suicide
   thread instead.
4. `1ms9q17` / pair 1079 — true title *"Judge strikes down key parts of Florida law that led to
   removal of books from school libraries"*. Candidate: `'Where is the money in prosecuting
   that?'` — vague rhetorical question; judge picked the Abrego Garcia deportation thread instead.
5. `1mtzg07` / pair 1087 — true title *"Park ranger fired after helping drape a transgender pride
   flag on Yosemite's El Capitan"*. Candidate: `'Trump has entered the chat'` — a generic meme
   phrase that fits almost any politically-adjacent thread; judge picked a China/Ukraine
   geopolitics thread instead.
6. `1ltwhle` / pair 113 — true title *"Man with rifle and tactical gear killed after exchange of
   fire with Border Patrol in Texas"*. Candidate: `'Trickle up economics'` — a two-word pun with
   no topic nouns; judge picked a National Guard weapons-policy thread instead.
7. `1luq507` / pair 195 — true title *"CDC ends emergency response to H5N1 bird flu"*. Candidate:
   `'This right here! Hel-lo!'` — pure exclamatory reaction; judge picked a German-zoo-baboon-cull
   thread instead.
8. `1m3gsf7` / pair 404 — true title *"E.P.A. Says It Will Eliminate Its Scientific Research Arm"*.
   Candidate: `'We all believed in Santa once'` — an analogy carrying zero literal topic words;
   judge picked the Stanford legacy-admissions thread instead.
9. `1mea2i9` / pair 715 — true title *"Kerr County, Texas, lead emergency management official says
   he was asleep during deadly flooding"*. Candidate: `'MAGA winners for sure'` — vague partisan
   label that fits many threads; judge picked the Fed-Governor-Lisa-Cook thread instead.
10. `1mxsijq` / pair 1195 — true title *"Kilmar Abrego Garcia could be deported to Uganda, official
    says"*. Candidate: `'Made the mistake of taking a fat rip myself'` — a personal drug-related
    tangent, unrelated in wording to the true topic; judge picked an ICE-protest-arrest thread
    instead.

**Interpretation.** Real human Reddit comments routinely function as *replies-to-replies*, pure
in-jokes, memes, or terse emotional reactions that only make sense inside the live back-and-forth
of the thread they came from — they assume shared context the judge doesn't have. Our generated
comments, by construction, tend to restate or paraphrase the thread's topic (title, named
entities, article nouns) inside the comment itself, because the generation pipeline conditions
directly on thread content. That makes them more self-contained, and self-contained text is
mechanically easier for a judge with only a snippet to place correctly. **This reframes the 89.3%
figure**: it is not evidence that our method is a more convincing *conversationalist* than a real
redditor — it is evidence that our comments leak more of the thread's topic into their own text
than a real reply typically needs to.

## Surprise B — cleaner than humans

Mechanics (spelling/grammar/punctuation) distribution, J5, per arm (n=244 each):

| Score | human | our_method | zlg |
|---|---|---|---|
| 1 | 5 | 0 | 19 |
| 2 | 30 | 3 | 19 |
| 3 | 33 | 2 | 11 |
| 4 | 75 | 37 | 49 |
| 5 | 101 | 202 | 146 |
| mean | 3.971 | 4.795 | 4.164 |

`our_method` scores a perfect 5 on 202/244 rows (82.8%) and never scores below 3. Real human
comments score ≤2 on 35/244 rows (14.3%) and even score 1 five times.

**Eight verbatim human comments that scored ≤2 on mechanics** (typos preserved exactly as
written):

1. `1moxmux` / pair 1003, mechanics 2 — *"Second point happens because these discoveries often
   presented by non academkca as \"and this is an example of how x people were always here and
   are just as euro locals, and how our legacy is not beung enslaved nor colonial migrants\" and
   such given that cities like London got like 10% african migrant today. The book Black tudors
   era recounted about 600 black people in Britain in that century(and some coming from the
   Spanish empire, not africa). Even if it was 2,000 it wouldn't have been much overall but does
   show they existed."* — judge evidence: *"Informal and historically focused like the
   references, but noticeably weakened by typos, awkward phrasing, and compressed sentence
   structure."*
2. `1mq83je` / pair 1036, mechanics 2 — *"also to add our internet is shit here in Oklahoma."*
3. `1lrjlzj` / pair 105, mechanics 1 — *"That's where it starts. It will become people who don't
   agree will dear leader."*
4. `1msv5eo` / pair 1080, mechanics 1 — *"Nope. You have to be ~~arya..~~. aeehm \"american\"."*
5. `1lt43pm` / pair 125, mechanics 2 — *"I'd imagine budget cuts for next years budget probably
   didn't cause this year crisis?"*
6. `1n0lt4e` / pair 1251, mechanics 1 — *"Am glad he's working hard on lower the price of food
   prices."*
7. `1n6qd7d` / pair 1451, mechanics 2 — *"Don't agree with the move but same sex marraige is not
   allowed across a lot of Africa."*
8. `1n0p6k3` / pair 1282, mechanics 2 — *"https://www.vice.com/en/article/twitter-elon-musk-dom-lucre-child-sexual-abuse/
   Twitter hasn't always had an owner who personally intervenes to unban people who post CSAM
   until Musk same along."*
9. `1lxjls6` / pair 223, mechanics 2 — *"Free speech absolootist"*
10. `1n29qpa` / pair 1342, mechanics 2 — *"Now you an RFK jr have something in common!"*

**Six verbatim `our_method` comments that scored 5 on mechanics:**

1. `1lqu69t` / pair 100 — *"It feels like we are just spinning wheels by assuming opposition
   inevitably creates enemies without looking at the actual outcomes of these policies."*
2. `1moxmux` / pair 1003 (Windrush post — see dedicated section below) — *"I really appreciate you
   pointing out that misconception about the Windrush generation being the first contact, because
   ignoring the long history of trade and migration just to fit a modern narrative is exactly the
   kind of bias we need to watch out for here."*
3. `1mp2r91` / pair 1004 — *"It feels a bit like we are just picking up trillions of dollars off
   the ground without asking if we can actually afford to keep them."*
4. `1mphfuh` / pair 1005 — *"It sounds like the family was just completely ignored by the system,
   which is exactly why these constitutional failures are so hard to fix."*
5. `1mpltgc` / pair 1006 — *"That guy really tried to flee after throwing the sandwich instead of
   just standing there taking a beating."*
6. `1mq3jmp` / pair 1007 — *"Honestly, it's scary to think about how thin that line is when
   someone just hopes a poor Marine doesn't get taken out by a cartel."*

**Is being cleaner than humans a liability for a system meant to blend in? Yes, and the dataset
has an independent instrument that says so directly.** `paired_rows.jsonl` carries a separate
suspicion judgment (`codex_suspicion`, `codex_suspicion_tells`) that is *not* mechanics itself but
flags things a suspicious reader would notice. Rates of the `over_polished` tell, out of 244 rows
per arm:

| Arm | over_polished rate |
|---|---|
| our_method | 15.2% (37/244) |
| zlg | 2.9% (7/244) |

`our_method`'s overall mean suspicion score (29.18) is actually slightly *lower* than zlg's
(30.41) — so the polish isn't universally suspicious — but the specific `over_polished` flag
attaches to `our_method` more than five times as often as to `zlg`. Concretely, six mechanics=5
`our_method` rows also carry the `over_polished` tag and non-trivial suspicion scores:

- `1lqdbns` pair 30, mechanics 5, suspicion 48 — *"The justice system moved fast enough; maybe
  some questions are meant to stay unanswered so the victims' families can find peace."*
- `1lqujx2` pair 101, mechanics 5, suspicion 84 — *"People are trying to make sense of this
  tragedy by blaming nationality, yet I feel like we're really just projecting our own fears onto
  a situation that happened far away."*
- `1lxm7tt` pair 287, mechanics 5, suspicion 72 — *"It's a bit unsettling thinking about those
  swollen lymph nodes and fever, especially when you realize how quickly it can turn into
  something much more dangerous than just a routine sinus infection."*
- `1lywh90` pair 289, mechanics 5, suspicion 62 — *"That $142 billion jump sounds scary, but it's
  good to know we can double-check these big government numbers right here on the official
  site."*
- `1lyx0ku` pair 290, mechanics 5, suspicion 78 — *"Honestly, calling out the 'sane-washing' here
  feels like pointing out a band-aid on a gaping wound; the administration keeps framing this as
  necessary order while ignoring that it's actually just econ[omic policy]..."*

My opinion: real Reddit threads are noisy by nature — grammar slips, typos, half-finished
thoughts and slang are the ambient texture the comment has to disappear into. A comment that is
grammatically flawless in a thread full of comments like `"academkca"`, `"beung"`, and
`"marraige"` is, on close reading, the outlier, not the norm. The mechanics score alone doesn't
capture that (it rewards our polish), but the independent suspicion signal does: `over_polished`
is disproportionately our method's tell. So yes — scoring 4.795/5 on mechanics is evidence the
carrier text is *not* well camouflaged along this axis, even though it looks like a win in the
headline number.

## Surprise C — cleaner yet rated lower overall

Pearson correlation of each J5 sub-score with `overall`, computed per arm (n=244 each):

| Sub-score | human | our_method | zlg |
|---|---|---|---|
| tone_formality | 0.769 | **0.885** | 0.841 |
| length_norm | 0.699 | 0.661 | 0.660 |
| mechanics | 0.408 | 0.334 | 0.452 |
| insider_knowledge | 0.494 | 0.579 | 0.658 |

Mean sub-score gaps, our_method minus human:

| Sub-score | our_method | human | gap |
|---|---|---|---|
| tone_formality | 3.369 | 3.520 | −0.151 |
| length_norm | 3.504 | 3.475 | +0.029 |
| mechanics | 4.795 | 3.971 | **+0.824** |
| insider_knowledge | 2.520 | 2.766 | −0.246 |
| **overall** | **3.193** | **3.402** | **−0.209** |

**What this shows:** mechanics is `our_method`'s single largest edge over humans (+0.824) but is
also the sub-score *least* correlated with `overall` in the `our_method` arm (r=0.334, the lowest
of the four). Tone_formality is the sub-score *most* correlated with `overall` for `our_method`
(r=0.885, higher than in either other arm) — and it's also one of the two sub-scores where
`our_method` trails humans. Insider_knowledge has the largest absolute deficit (−0.246) and a
moderate correlation (0.579). Put together: `our_method`'s big mechanical advantage is nearly
invisible to the overall score, while its two real deficits — sounding a bit too formal/measured
(tone_formality) and lacking thread-specific insider references (insider_knowledge) — sit on the
sub-scores that actually move `overall`, and tone_formality is the stronger lever of the two.

**Six examples where `our_method` scored mechanics=5 but overall≤2**, with the judge's verbatim
evidence (note how often the evidence talks about formality/tone, not grammar):

1. `1lqu69t` pair 100 — tone_formality 2, mechanics 5, overall 2. Evidence: *"The polished,
   abstract policy language is more formal and generic than the thread's concrete, informal,
   profanity-laced discussion."* Candidate: *"It feels like we are just spinning wheels by
   assuming opposition inevitably creates enemies without looking at the actual outcomes of these
   policies."*
2. `1mpltgc` pair 1006 — tone_formality 3, mechanics 5, overall 2. Evidence: *"Casual and
   mechanically clean, but lacks the sandwich-related wordplay that defines the reference
   style."* Candidate: *"That guy really tried to flee after throwing the sandwich instead of
   just standing there taking a beating."*
3. `1mq4lza` pair 1022 — tone_formality 3, mechanics 5, overall 2. Evidence: *"The casual phrasing
   fits Reddit, but it is generic, brief, and lacks the Canada- or immigration-specific
   perspective of the genuine comments."* Candidate: *"I guess people are just stuck in their
   lanes right now while we sort out all this regional stuff that actually needs fixing first."*
4. `1mtunw2` pair 1085 — tone_formality 2, mechanics 5, overall 2. Evidence: *"Clear and polished,
   but generic and reflective rather than matching the blunt, informal, personal Reddit
   register."* Candidate: *"Honestly, I think it shows how confusing these debates get when
   everyone just takes the path of least resistance instead of talking it out."*
5. `1ltho9m` pair 111 — tone_formality 2, mechanics 5, overall 2. Evidence: *"Clear and
   grammatical, but more measured and formal than the casual, joking, error-prone community
   comments."* Candidate: *"It feels strange that there is still so much debate when the official
   stance seems to be that we just can't release the child porn material."*
6. `1mwdfat` pair 1160 — tone_formality 1, mechanics 5, overall 1. Evidence: *"Polished,
   analytical, and comparatively long; it lacks the casual slang, bluntness, and celebratory tone
   of the genuine comments."* Candidate: *"Reading about how his influence stretched from local
   parenting advice all the way to federal lobbying makes me wonder what other organizations are
   quietly driving this kind of culture war today."*

The evidence text is consistent across all six: "more formal," "polished," "measured," "abstract"
— that vocabulary is what the judge means by low tone_formality (matched register), not by
mechanics. `our_method`'s comments read like an earnest, hedged op-ed reply; the r/news and
r/politics threads they're dropped into are blunt, sarcastic, profane, and specific. That register
mismatch, not grammar, is what drives the 3.193-vs-3.402 gap.

## The Windrush comment (1moxmux) across J4 and J5

Post `1moxmux`, true title *"Youths buried in Anglo-Saxon cemeteries carried West African DNA"*
(pair_id 1003 across all judgments). Full verbatim records, all three arms:

**J4 (attribution)** — all three arms attributed correctly to thread index 1:

- `our_method` — candidate: *"I really appreciate you pointing out that misconception about the
  Windrush generation being the first contact, because ignoring the long history of trade and
  migration just to fit a modern narrative is exactly the kind of bias we need to watch out for
  here."* `answer.thread_index=1`, `result.thread_index=1`, confidence 98. Evidence: *"The comment
  discusses the long history of African migration and challenges the idea that Windrush was the
  first contact, directly relating to West African DNA in Anglo-Saxon cemeteries."*
- `zlg` — candidate: *" So the grandparents could've easily been on the trade routes, and the
  parents could've easily been on the ship that came to the UK."* `answer.thread_index=1`,
  `result.thread_index=1`, confidence 99. Evidence: *"The comment discusses West African ancestry
  reaching the UK via trade routes and ships, directly matching the Anglo-Saxon cemetery DNA
  article."*
- `human` — candidate: *"It's crazy because there are literal old painting with Black people in
  them. Like, nearly photographic evidence."* `answer.thread_index=1`, `result.thread_index=1`,
  confidence 85. Evidence: *"The comment discusses historical visual evidence of Black people in
  old paintings, which directly relates to the article about West African ancestry in Anglo-Saxon
  cemeteries."*

**J5 (register)**:

- `our_method` — candidate as above. `tone_formality=3, length_norm=4, mechanics=5,
  insider_knowledge=4, overall=3`. Evidence: *"Clear and plausible, but more polished and
  meta-commentary-oriented than the casual, profanity-heavy examples."*
- `human` — candidate: *"Second point happens because these discoveries often presented by non
  academkca as \"and this is an example of how x people were always here and are just as euro
  locals, and how our legacy is not beung enslaved nor colonial migrants\" and such given that
  cities like London got like 10% african migrant today. The book Black tudors era recounted
  about 600 black people in Britain in that century(and some coming from the Spanish empire, not
  africa). Even if it was 2,000 it wouldn't have been much overall but does show they existed."*
  `tone_formality=3, length_norm=4, mechanics=2, insider_knowledge=4, overall=3`. Evidence:
  *"Informal and historically focused like the references, but noticeably weakened by typos,
  awkward phrasing, and compressed sentence structure."*
- `zlg` — candidate as above. `tone_formality=4, length_norm=3, mechanics=5,
  insider_knowledge=3, overall=4`. Evidence: *"Casual, speculative Reddit phrasing with clean
  mechanics and a concise length, though less detailed than most examples."*

Note the pattern in miniature: `our_method` and `human` tie on overall (3 apiece) despite
`our_method` having far better mechanics (5 vs 2) — the human comment's rich, thread-specific
historical detail (insider_knowledge 4, matching `our_method`'s 4) and moderate tone offset its
typos; `zlg`, meanwhile, scores *higher* overall (4) than both despite a shorter, less detailed
comment, illustrating that overall isn't simply "most polished wins" in either direction — the
$attribution$ result is a clean sweep for all three arms on this post, but the $register$ result
shows `our_method`'s mechanics edge doing nothing to lift it above the human control.

## Plain-language summaries

**Surprise A.** When judges were shown a comment and asked to guess which news thread it came
from, our AI-generated comments were correctly matched far more often (89%) than genuine human
Reddit comments (75%). This isn't because our comments are smarter — it's because real humans
often write short reactions, in-jokes, or replies that only make sense if you were already
following the conversation ("Yeah, I have no sympathy," "Trump has entered the chat"), so they
give the judge almost nothing to go on. Our generated comments, because they're built by summarizing
the thread they're hiding a message inside, tend to restate the topic in their own words, which
makes them easy to trace back to their source — the opposite of what a real, well-blended message
should do.

**Surprise B.** Our AI comments have cleaner spelling and grammar (4.8 out of 5) than real human
comments (4.0 out of 5), full of the typos and awkward phrasing you'd expect from actual Reddit
users typing fast ("academkca," "marraige," "same along"). That sounds like a win, but for a
system that's trying to hide a secret message by *blending in*, being noticeably more polished
than everyone else in the room is a red flag, not camouflage — and a second, independent check in
this same dataset (a "does this look suspicious" judge) flags our comments as "over-polished"
five times more often than the baseline system, even though our comments don't otherwise look more
suspicious overall.

**Surprise C.** Even though our AI comments are grammatically cleaner than real humans, judges
still rated them lower overall (3.2 out of 5) than real human comments (3.4 out of 5). The reason
is that grammar barely moves the overall score — what actually drives it is whether the comment
*sounds* like a real, blunt, sometimes-crude Reddit reply versus a slightly too-formal, hedge-y,
"thoughtful" one, and whether it shows the kind of specific insider knowledge a real commenter in
that thread would have. Our comments tend to read a bit like a polite op-ed response — grammatically
perfect, and slightly too polished and neutral in tone — which is exactly the trait that keeps
their overall scores below the messier-but-more-authentic-sounding human comments.

## Limits

- "Content-word overlap" and "pure reaction" in Surprise A are a rough lexical heuristic (case-
  folded content words, length > 2, minus a hand-built stopword list) computed by the scratch
  script for this analysis — they are directional evidence, not a validated NLP metric, and were
  used only to quantify a pattern that is independently visible in the quoted examples.
- Judge confidence and evidence fields are the judge model's own self-reported reasoning
  (`gpt-5.6-luna`, reasoning_effort=high) and are not independently verified against ground truth
  beyond the `answer` field already embedded per-task.
- The "over_polished" suspicion signal used in Surprise B comes from `paired_rows.jsonl`, which
  has no `human` arm (only `our_method` and `zlg`, 244 rows each) — so the polish-as-liability
  argument is made by comparing our method against the `zlg` baseline's suspicion profile, not
  directly against humans on that particular instrument.
- All correlations in Surprise C are simple Pearson correlations per arm (n=244 each), not a
  controlled multivariate regression; the "most explains" conclusion is based on comparing raw
  mean gaps against per-arm correlation strength, not a fitted model with confidence intervals.
- Sample sizes are internally consistent (244 per arm per metric) but this is a single benchmark
  run (`zlg_lucid_fresh_6x_20260815_independent_unique_judge`); no cross-run replication was
  checked as part of this analysis.
