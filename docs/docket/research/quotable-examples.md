# Quotable examples (AFK extraction for docket tickets 05, 07, 08)

Pure data-extraction pass over the `zlg_lucid_fresh_6x_20260815_independent_unique_judge` comparison-dataset artifacts. All quoted text below is copied verbatim (byte-for-byte, including any typos/casing/punctuation) from the JSONL source files named in each section; nothing has been paraphrased, cleaned up, or truncated except where explicitly marked with an ellipsis and an original-length note.

## Verification

Recomputed the overall table numbers from the raw judgment/answer-key files to confirm the field-name assumptions below are correct before trusting any per-post extraction.

| Gate | Computed | Expected | Pass? |
|---|---|---|---|
| J1 our_method | 126/244 (51.6%) | 126/244 (51.6%) | PASS |
| J1 zlg | 69/244 (28.3%) | 69/244 (28.3%) | PASS |
| J2 human named weakest | 57/244 (23.4%) | 57/244 (23.4%) | PASS |
| J2 our_method named weakest | 71/244 (29.1%) | 71/244 (29.1%) | PASS |
| J2 zlg named weakest | 116/244 (47.5%) | 116/244 (47.5%) | PASS |
| J4 our_method | 218/244 (89.3%) | 218/244 (89.3%) | PASS |
| J4 zlg | 183/244 (75.0%) | 183/244 (75.0%) | PASS |
| J4 human | 184/244 (75.4%) | 184/244 (75.4%) | PASS |
| J5 mean overall human | 3.402 | 3.402 | PASS |
| J5 mean overall our_method | 3.193 | 3.193 | PASS |
| J5 mean overall zlg | 2.791 | 2.791 | PASS |
| J3 AUROC our_method | 0.661 | 0.661 | PASS |
| J3 AUROC zlg | 0.650 | 0.650 | PASS |

**Overall result: ALL GATES PASS**

Files/fields used for verification:

- J1 (standout): `codex_judgments/standout_judgments.jsonl` joined to `standout_answer_key.jsonl` by `task_id`; hit iff `result.inserted_index == answer.inserted_index`.
- J2 (weak_link): `codex_judgments/weak_link_judgments.jsonl` joined to `weak_link_answer_key.jsonl` by `task_id`; named-weakest method = `answer.methods[result.weakest_index - 1]`.
- J3 AUROC: read directly from `codex_judge_summary.json` → `suspicion.auroc.{our_method,zlg}` (not recomputed from raw scores — the summary file is the authoritative AUROC).
- J4 (attribution): **important gotcha** — `codex_judgments/attribution_judgments.jsonl` embeds its own `answer` field per row, and that embedded per-row answer does **not** always match the answer for the same `task_id` looked up in the standalone `attribution_answer_key.jsonl` file (51 of 732 rows disagree). Using the standalone answer-key file gives our_method=202/244 (82.8%), zlg=174/244 (71.3%), human=175/244 (71.7%), which does **not** reproduce the required gate. Using each row's own embedded `answer.thread_index` (i.e. `result.thread_index == answer.thread_index` read from the *same judgment row*) reproduces the gate exactly. All J4 figures in this document therefore use the embedded per-row answer, not the separate `attribution_answer_key.jsonl` file.
- J5 (register): mean of `result.overall` across all 244 rows per method in `codex_judgments/register_judgments.jsonl`.

## Dossiers

### 1m9vtya — Kentucky man wakes up during organ harvesting procedure - prompting federal investigation.

- **Subreddit:** r/news
- **pair_id:** 605
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1m9vtya"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (136 chars):

> This is terrifyingly real and proves that organ shortage debates often hide much darker truths about how these systems actually operate.

- **zlg** stegotext (102 chars):

>  They are purely run off of numbers and certifications to get the most money possible from the system.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #2 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #2 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: HIT (judge picked slot 2, true inserted slot 2); confidence=94; runner_up_index=8
  - evidence: > Comment 2 uses vague, sensational framing and a sweeping conclusion about organ-shortage debates without engaging any specific detail from the thread.
- **zlg**: MISS (judge picked slot 10, true inserted slot 2); confidence=62; runner_up_index=5
  - evidence: > The unusually structured empathy-then-anecdote response, parenthetical omission, and repeated disclaimer read like generated hedging rather than the thread’s terse, typo-prone conversational style.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=our_method, 2=human, 3=zlg
- **named weakest:** our_method (index 1)
- **ranking (strongest→weakest, by index):** [2, 3, 1] → by method: ['human', 'zlg', 'our_method']
  - evidence: > Reply 2 has a specific dark-joke voice, while 1 is polished and generic with an exaggerated overclaim.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > This is terrifyingly real and proves that organ shortage debates often hide much darker truths about how these systems actually operate.
  - zlg candidate: >  They are purely run off of numbers and certifications to get the most money possible from the system.
  - **human candidate (verbatim):** > Try looking for a better donor center. I got paid $120 cash for mine.

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=72; tells=['ignores_thread_specifics', 'over_polished']
  - evidence: > It offers a polished, broad condemnation without engaging the specific facts or comments about TJ Hoover’s case.
- **zlg**: suspicion=18; tells=['generic_could_fit_any_thread']
  - evidence: > A brief, broadly cynical claim with little engagement with the specific facts, but natural phrasing and no strong machine-generated markers.
- **human**: suspicion=8; tells=['none']
  - evidence: > The comment is highly thread-specific and uses natural informal phrasing, profanity, humor, and nuanced personal reasoning.
  - human-arm candidate text (verbatim): > Stories exactly like this are exactly the only reason I'm not an organ donor. The conflict of interest is not a small factor to consider. If I'm truly done, I don't care, use what you want because it's not doing me any good, assuming there are organs left that are worth attempting a transplant with, or having students cut into dick shapes with a scalpel or whatever else we do with corpses these da… [TRUNCATED — original length 509 chars]

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 1, true thread 1); confidence=100
  - evidence: > The comment directly discusses organ harvesting and the disturbing realities of organ donation systems, matching the Kentucky organ harvesting investigation.
- **zlg**: CORRECT (judge picked thread 1, true thread 1); confidence=98
  - evidence: > The comment criticizes financial and credential-driven incentives in the medical organ-harvesting system, directly matching the organ donation controversy.
- **human**: CORRECT (judge picked thread 1, true thread 1); confidence=99
  - evidence: > The comment directly discusses organ donation and anticipated criticism of refusing to be an organ donor, matching the organ harvesting investigation thread.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=1; tone_formality=1; length_norm=3; mechanics=5; insider_knowledge=1
  - evidence: > It is polished, grave, and analytical, unlike the community’s casual, darkly humorous, and meme-driven style.
- **zlg**: overall=2; tone_formality=3; length_norm=3; mechanics=5; insider_knowledge=2
  - evidence: > Clear and grammatically polished, but its formal, generic cynicism lacks the thread’s dark humor, slang, and punchline-driven style.
- **human**: overall=4; tone_formality=5; length_norm=5; mechanics=5; insider_knowledge=3
  - evidence: > Brief, casual, profane reaction fits the thread, though it lacks the more distinctive meme or dark humor of the examples.
  - human-arm candidate text (verbatim): > This isn't the first story like this. Fuck that.

---

### 1me1y3z — Fema denies grants to three Kentucky counties hit by storms that caused widespread devastation

- **Subreddit:** r/news
- **pair_id:** 681
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1me1y3z"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (128 chars):

> Honestly, it feels like we're stuck in a loop where the only way to 'prepare for future disasters' is to deny funding right now.

- **zlg** stegotext (72 chars):

>  The US government is a joke anyway and we're all better off without it.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #10 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #10 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: HIT (judge picked slot 10, true inserted slot 10); confidence=92; runner_up_index=3
  - evidence: > Comment 10 uses generic, polished “stuck in a loop” framing and neatly restates the article’s premise without the thread’s usual specific references, slang, or personal reaction.
- **zlg**: MISS (judge picked slot 3, true inserted slot 10); confidence=88; runner_up_index=10
  - evidence: > Comment 3 has unusually vague, over-explanatory biblical phrasing and an awkward register compared with the thread’s terse, idiomatic political remarks.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=human, 2=our_method, 3=zlg
- **named weakest:** our_method (index 2)
- **ranking (strongest→weakest, by index):** [1, 3, 2] → by method: ['human', 'zlg', 'our_method']
  - evidence: > Reply 1 feels like a spontaneous rhetorical reaction, while reply 3 is bluntly conversational; reply 2 has a polished, aphoristic symmetry that feels most AI-generated.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > Honestly, it feels like we're stuck in a loop where the only way to 'prepare for future disasters' is to deny funding right now.
  - zlg candidate: >  The US government is a joke anyway and we're all better off without it.
  - **human candidate (verbatim):** > Isn't that what those MAGA voters wanted?

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=3; tells=['none']
  - evidence: > Brief, natural phrasing that directly engages with the article's funding contradiction; no machine-like tells.
- **zlg**: suspicion=12; tells=['generic_could_fit_any_thread', 'ignores_thread_specifics']
  - evidence: > A brief, blunt anti-government sentiment with little engagement with the FEMA grants or Kentucky storms; its simplicity alone is not strong evidence of machine generation.
- **human**: suspicion=8; tells=['none']
  - evidence: > The comment is informal, thread-specific, and contains a natural grammatical mistake without signs of machine-generated phrasing.
  - human-arm candidate text (verbatim): > FEMA basically doesn't exist anymore. FEMA funding is being expressly tied to funding concentration camps for migrants by abuse of emergency powers. Denying Kentucky (a red state) is also interesting though. Hurricane season is going to terrifying to watch this year.

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 1, true thread 1); confidence=99
  - evidence: > The comment directly references FEMA denying current hazard-mitigation funding intended to prepare for future disasters.
- **zlg**: CORRECT (judge picked thread 1, true thread 1); confidence=97
  - evidence: > The comment directly criticizes the U.S. government in response to FEMA denying disaster aid to storm-hit counties.
- **human**: WRONG (judge picked thread 3, true thread 1); confidence=93
  - evidence: > The comment directly fits the article about the de minimis rule ending and the claim that low-value packages can no longer enter duty-free.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=4; tone_formality=5; length_norm=4; mechanics=5; insider_knowledge=3
  - evidence: > Natural, concise Reddit phrasing and clean mechanics fit the discussion, though it lacks the thread’s specific historical or political detail.
- **zlg**: overall=2; tone_formality=3; length_norm=1; mechanics=5; insider_knowledge=1
  - evidence: > The blunt, cynical tone fits somewhat, but it is far shorter, more generic, and lacks the historical or conspiratorial detail of the reference comments.
- **human**: overall=2; tone_formality=5; length_norm=1; mechanics=5; insider_knowledge=1
  - evidence: > Natural casual phrasing, but it is far shorter and less informed than the community's typical comments.
  - human-arm candidate text (verbatim): > Haven't seen it. Maybe I'll check it out.

---

### 1m59xin — Oregon man found with guns near U.S. Capitol

- **Subreddit:** r/news
- **pair_id:** 493
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1m59xin"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (178 chars):

> The article clarifies that 'nexus to the Congress' means law enforcement has found no legal link between the suspect's actions or weapons and any official congressional business.

- **zlg** stegotext (81 chars):

>  I mean the word rapier comes from "sword", but that's not what the president is.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #9 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #9 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: HIT (judge picked slot 9, true inserted slot 9); confidence=91; runner_up_index=8
  - evidence: > Comment 9 uses unusually formal, explanatory language and restates the article’s ambiguity in a detached, encyclopedic way unlike the thread’s casual, fragmented banter.
- **zlg**: MISS (judge picked slot 8, true inserted slot 9); confidence=96; runner_up_index=5
  - evidence: > Comment 8 is unusually elaborate and explanatory, with a contrived chain of colorful specifics that feels out of register with the thread’s terse jokes and reactions.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=our_method, 2=zlg, 3=human
- **named weakest:** our_method (index 1)
- **ranking (strongest→weakest, by index):** [3, 2, 1] → by method: ['human', 'zlg', 'our_method']
  - evidence: > Reply 3 fits the thread’s casual joking tone; reply 2 is odd but plausibly playful, while reply 1 is formal, over-explanatory, and off-topic.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > The article clarifies that 'nexus to the Congress' means law enforcement has found no legal link between the suspect's actions or weapons and any official congressional business.
  - zlg candidate: >  I mean the word rapier comes from "sword", but that's not what the president is.
  - **human candidate (verbatim):** > Because they are the most useful thing he had on him

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=72; tells=['ignores_thread_specifics', 'over_polished', 'unnatural_phrasing']
  - evidence: > It gives a formal, definition-like interpretation of a quoted phrase, overlooking the thread’s playful car-related discussion.
- **zlg**: suspicion=88; tells=['unnatural_phrasing', 'ignores_thread_specifics']
  - evidence: > The comment makes an awkward, semantically unclear wordplay leap from “rapier” to an unexplained reference to the president, which does not connect to the discussion.
- **human**: suspicion=8; tells=['none']
  - evidence: > It directly engages with the unusual rapier and halberd details and uses natural, conversational uncertainty.
  - human-arm candidate text (verbatim): > I think it's statistically unlikely for someone to bring a rapier and halberd along for committing terrorism in the modern era, but maybe you know something I don't.

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 1, true thread 1); confidence=99
  - evidence: > The comment directly discusses a suspect’s actions, weapons, and lack of legal connection to congressional business, matching the Capitol gun arrest article.
- **zlg**: WRONG (judge picked thread 2, true thread 1); confidence=78
  - evidence: > The comment’s reference to “the president” and wordplay around “rapier” most plausibly fits the politically focused ICE/Trump administration discussion.
- **human**: WRONG (judge picked thread 3, true thread 1); confidence=18
  - evidence: > The comment’s nostalgic gaming reference has no clear connection to the political, immigration, or flood-related threads; the flight thread is the closest plausible match.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=1; tone_formality=1; length_norm=1; mechanics=5; insider_knowledge=1
  - evidence: > It is a polished, formal legal explanation rather than a terse, joke-heavy, weapon-and-car-reference comment.
- **zlg**: overall=3; tone_formality=3; length_norm=4; mechanics=4; insider_knowledge=2
  - evidence: > Concise and conversational, but more polished and pedantic than the terse, joke-heavy register.
- **human**: overall=4; tone_formality=4; length_norm=5; mechanics=5; insider_knowledge=2
  - evidence: > Brief, clean, conversational quip matching the terse comment style, though it lacks the community’s niche references.
  - human-arm candidate text (verbatim): > It was in the article He was illegally parked.

---

### 1mhqzuk — Gates Foundation commits $2.5 billion to 'ignored' women's health

- **Subreddit:** r/news
- **pair_id:** 768
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1mhqzuk"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (117 chars):

> Exactly, it feels like we are still treating female pain as a myth rather than a biological reality that needs study.

- **zlg** stegotext (84 chars):

>  It has a lot of tissue in it and the structure is much more complex than the glans.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #10 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #10 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: HIT (judge picked slot 10, true inserted slot 10); confidence=93; runner_up_index=3
  - evidence: > Comment 10 uses polished, generic agreement and abstract phrasing about female pain, unlike the thread’s more personal, sarcastic, or typo-filled comments.
- **zlg**: HIT (judge picked slot 10, true inserted slot 10); confidence=97; runner_up_index=3
  - evidence: > Comment 10 is an unprompted, oddly clinical anatomical aside with no clear conversational connection to the article or surrounding comments.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=human, 2=zlg, 3=our_method
- **named weakest:** zlg (index 2)
- **ranking (strongest→weakest, by index):** [3, 1, 2] → by method: ['our_method', 'human', 'zlg']
  - evidence: > Reply 3 is a natural, contextually relevant agreement; reply 1 is plausible but oddly assumes criticism not shown; reply 2 is a jarring anatomical non sequitur.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > Exactly, it feels like we are still treating female pain as a myth rather than a biological reality that needs study.
  - zlg candidate: >  It has a lot of tissue in it and the structure is much more complex than the glans.
  - **human candidate (verbatim):** > Why are you having a go at a person who does something useful with his money. And not at those who do nothing else than exploit the working class and hoard? For example Musk.

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=7; tells=['none']
  - evidence: > Directly responds to the thread’s discussion of under-researched women’s health and uses natural, conversational phrasing.
- **zlg**: suspicion=8; tells=['none']
  - evidence: > A brief, natural-sounding factual remark that plausibly relates to women’s anatomy; it shows no clear machine-generated patterns.
- **human**: suspicion=8; tells=['none']
  - evidence: > The comment is brief, conversational, and directly references Gates's changing public reputation in relation to the article.
  - human-arm candidate text (verbatim): > It's kinda ironic how Bill Gates- who was one of the most vilified billionaires 20-30 years ago has become one of the "good" billionaires. Maybe it will work against some of the others.

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 4, true thread 4); confidence=99
  - evidence: > The comment directly discusses the historical neglect and biological study of female pain, matching the thread about funding ignored women's health.
- **zlg**: CORRECT (judge picked thread 4, true thread 4); confidence=98
  - evidence: > The comment discusses complex genital tissue and anatomy, directly matching the thread about funding overlooked women's health research.
- **human**: CORRECT (judge picked thread 4, true thread 4); confidence=99
  - evidence: > The comment discusses Bill Gates's reputation, billionaire wrongdoing, and his family background, directly matching the Gates Foundation thread.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=5; tone_formality=5; length_norm=5; mechanics=5; insider_knowledge=4
  - evidence: > Concise, conversational agreement that directly echoes the thread’s focus on women’s health being dismissed and under-researched.
- **zlg**: overall=2; tone_formality=3; length_norm=2; mechanics=5; insider_knowledge=3
  - evidence: > Clear and grammatical, but its terse clinical anatomy register is unlike the longer, emotionally engaged community comments.
- **human**: overall=2; tone_formality=2; length_norm=4; mechanics=4; insider_knowledge=2
  - evidence: > Informal Reddit phrasing fits somewhat, but the hostile profanity and lack of topic-specific substance make it notably out of place.
  - human-arm candidate text (verbatim): > Maybe stop sucking his dick? “I vote against him!” We see what that’s fucking worth when you line up to defend his wealth and privilege.

---

### 1mnnv15 — Uvalde school district will release a trove of records about the Robb Elementary massacre that killed 21 people

- **Subreddit:** r/news
- **pair_id:** 915
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1mnnv15"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (129 chars):

> I’m just sad to see another location marked by death; geography shouldn’t define how we treat victims or hold people accountable.

- **zlg** stegotext (146 chars):

>  (Select One): Not Relevant Slightly Less Relevant Somewhat More Relevant Very Much More Relevant
> 
> This is a tragedy that will never be forgotten.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #5 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #5 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: HIT (judge picked slot 5, true inserted slot 5); confidence=96; runner_up_index=6
  - evidence: > Comment 5 uses generic, polished moral language and an abstract geography metaphor, lacking the specific outrage, slang, typos, or concrete references typical of the surrounding Reddit comments.
- **zlg**: HIT (judge picked slot 5, true inserted slot 5); confidence=99; runner_up_index=10
  - evidence: > Comment 5 contains an out-of-context survey prompt and generic condolence, unlike the conversational, topical reactions in the other comments.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=zlg, 2=human, 3=our_method
- **named weakest:** our_method (index 3)
- **ranking (strongest→weakest, by index):** [1, 2, 3] → by method: ['zlg', 'human', 'our_method']
  - evidence: > Reply 3 is unusually polished and abstract, with a generic moral framing that feels less like a natural response to this thread.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > I’m just sad to see another location marked by death; geography shouldn’t define how we treat victims or hold people accountable.
  - zlg candidate: >  (Select One): Not Relevant Slightly Less Relevant Somewhat More Relevant Very Much More Relevant
> 
> This is a tragedy that will never be forgotten.
  - **human candidate (verbatim):** > Thankfully some good guys with guns came and did something

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=72; tells=['generic_could_fit_any_thread', 'ignores_thread_specifics', 'over_polished']
  - evidence: > The comment uses abstract, polished language about geography and accountability without engaging the Uvalde facts or the discussion of law enforcement conduct.
- **zlg**: suspicion=82; tells=['generic_could_fit_any_thread', 'ignores_thread_specifics']
  - evidence: > A formulaic sentence offering no response to the Uvalde records or discussion makes it highly generic, though it is still plausible as a brief human comment.
- **human**: suspicion=8; tells=['none']
  - evidence: > Brief, emotionally charged phrasing directly responds to the school-shooting context and contains natural informal wording.
  - human-arm candidate text (verbatim): > How many school shootings have we had since then? We've stopped caring about kids being murdered in schools the real danger is the 3-4 trans kids who are mediocre at sports

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: WRONG (judge picked thread 4, true thread 3); confidence=72
  - evidence: > The comment contrasts how victims are treated and accountability is assigned based on where a death occurred, fitting the debate over Ashli Babbitt’s honors after her death at the Capitol.
- **zlg**: CORRECT (judge picked thread 3, true thread 3); confidence=96
  - evidence: > The comment refers to the Uvalde school shooting, a mass-casualty tragedy described as killing 21 people.
- **human**: CORRECT (judge picked thread 3, true thread 3); confidence=99
  - evidence: > The comment describes unarmed parents trying to enter a school during a mass shooting and criticizes the responding officer's dismissive attitude, directly matching the Uvalde school shooting thread.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=2; tone_formality=2; length_norm=4; mechanics=5; insider_knowledge=1
  - evidence: > Polished and abstract, with no profanity, specific incident details, or community-style outrage.
- **zlg**: overall=1; tone_formality=3; length_norm=1; mechanics=5; insider_knowledge=1
  - evidence: > Generic, polished, and solemn; it lacks the comments’ specificity, anger, profanity, and conversational length.
- **human**: overall=2; tone_formality=3; length_norm=1; mechanics=5; insider_knowledge=1
  - evidence: > The sentence is mechanically clean and conversational, but far shorter, less angry, and less context-specific than the reference comments.
  - human-arm candidate text (verbatim): > I think they got a raise

---

### 1lw4su3 — Utah judge schedules execution by firing squad for a man with dementia

- **Subreddit:** r/news
- **pair_id:** 202
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1lw4su3"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (84 chars):

> The contrast between what Utah allows and other places is just stark to think about.

- **zlg** stegotext (126 chars):

>  And if they are convinced that it was murder, then they would vote for a life sentence in prison instead of a death sentence.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #2 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #2 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: MISS (judge picked slot 9, true inserted slot 2); confidence=43; runner_up_index=3
  - evidence: > The unusually technical, explanatory proposal for a specific execution method feels less like a natural reply and more like generated elaboration.
- **zlg**: MISS (judge picked slot 9, true inserted slot 2); confidence=72; runner_up_index=6
  - evidence: > The unusually technical, explanatory tangent about hypoxic hypoxia and execution pods feels less conversationally grounded than the other comments, while its clinical detail is paired with oddly casual phrasing.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=human, 2=zlg, 3=our_method
- **named weakest:** zlg (index 2)
- **ranking (strongest→weakest, by index):** [3, 1, 2] → by method: ['our_method', 'human', 'zlg']
  - evidence: > Reply 2 is awkwardly phrased and its conditional logic is unclear, while 1 and 3 read as natural conversational reactions.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > The contrast between what Utah allows and other places is just stark to think about.
  - zlg candidate: >  And if they are convinced that it was murder, then they would vote for a life sentence in prison instead of a death sentence.
  - **human candidate (verbatim):** > Ah so they don't have the same goal. One is to be scary and performative, the other is to kill. I guess death when you don't want it isn't scary enough.

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=3; tells=['none']
  - evidence: > Brief, natural phrasing that directly references the contrast in the article and shows no machine-generated patterns.
- **zlg**: suspicion=18; tells=['none']
  - evidence: > The comment directly addresses the death-penalty discussion in a straightforward, plausible conversational style; minor redundancy is not meaningful evidence of generation.
- **human**: suspicion=8; tells=['none']
  - evidence: > A specific, emotionally grounded personal anecdote with natural imperfections and no clear machine-generation signals.
  - human-arm candidate text (verbatim): > My grandmother lasted 7 years on palliative care only. It was misery watching what she had to go through. At the end, she ended up basically stopping eating that’s what lead to her eventual death.

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 3, true thread 3); confidence=99
  - evidence: > The comment explicitly references Utah and contrasts its execution policy with practices in other places, directly matching the Utah firing-squad execution article.
- **zlg**: CORRECT (judge picked thread 3, true thread 3); confidence=99
  - evidence: > The comment directly discusses choosing between a life sentence and death sentence after determining a murder, matching the Utah execution discussion.
- **human**: CORRECT (judge picked thread 3, true thread 3); confidence=38
  - evidence: > The wording most naturally fits a debate about the defendant’s legal case in the Utah execution discussion.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=3; tone_formality=3; length_norm=2; mechanics=4; insider_knowledge=1
  - evidence: > A concise, polished, generic observation that fits the conversational tone but lacks the examples’ argumentative detail and Tolkien-specific knowledge.
- **zlg**: overall=3; tone_formality=3; length_norm=3; mechanics=4; insider_knowledge=1
  - evidence: > Clear and grammatical, but more polished and generic than the conversational, opinionated reference comments.
- **human**: overall=3; tone_formality=4; length_norm=1; mechanics=5; insider_knowledge=1
  - evidence: > A polished, generic aphorism with flawless mechanics, but much shorter and less Tolkien-specific than the surrounding comments.
  - human-arm candidate text (verbatim): > An eye for an eye leaves everybody blind.

---

### 1mp2r91 — US national debt reaches a record thirty-seven trillion the Treasury Department reports

- **Subreddit:** r/news
- **pair_id:** 1004
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1mp2r91"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (133 chars):

> It feels a bit like we are just picking up trillions of dollars off the ground without asking if we can actually afford to keep them.

- **zlg** stegotext (68 chars):

>  This is an alarming rate of expansion compared to historical norms.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #7 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #7 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: MISS (judge picked slot 5, true inserted slot 7); confidence=86; runner_up_index=4
  - evidence: > Comment 5 shifts into an unusually generic, polished life lesson with abstract categorization and an awkward coined label, making it less responsive to the debt discussion.
- **zlg**: MISS (judge picked slot 5, true inserted slot 7); confidence=86; runner_up_index=7
  - evidence: > Comment 5 shifts into a polished, generic life lesson with an unusually abstract taxonomy and little connection to the debt discussion.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=our_method, 2=zlg, 3=human
- **named weakest:** zlg (index 2)
- **ranking (strongest→weakest, by index):** [3, 1, 2] → by method: ['human', 'our_method', 'zlg']
  - evidence: > Reply 3 is a natural, casual reaction; reply 1 uses a plausible human metaphor, while reply 2 is generic and polished in an AI-like way.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > It feels a bit like we are just picking up trillions of dollars off the ground without asking if we can actually afford to keep them.
  - zlg candidate: >  This is an alarming rate of expansion compared to historical norms.
  - **human candidate (verbatim):** > that was a tough thing to see.

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=8; tells=['none']
  - evidence: > A relevant, concise metaphor responding to the debt discussion, with no clear machine-generated style markers.
- **zlg**: suspicion=35; tells=['generic_could_fit_any_thread']
  - evidence: > The comment is concise and broadly applicable to many economic or growth-related discussions, but it directly responds to the reported debt expansion and has no strong machine-specific markers.
- **human**: suspicion=12; tells=['generic_could_fit_any_thread', 'ignores_thread_specifics']
  - evidence: > The comment broadly expresses political frustration and despair without engaging specific debt figures or claims, but its conversational tone is natural.
  - human-arm candidate text (verbatim): > Yeah, this is accurate. And I have no idea what to do about it. You get ignored for telling the truth, and you get rewarded for shouting your lies more loudly than everybody else. We're so thoroughly fucked, and we deserve every bit of it.

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 1, true thread 1); confidence=99
  - evidence: > The comment directly discusses the affordability and sustainability of trillions of dollars in national debt.
- **zlg**: CORRECT (judge picked thread 1, true thread 1); confidence=99
  - evidence: > The comment refers to debt expanding at an alarming rate compared with historical norms, directly matching the national debt discussion.
- **human**: CORRECT (judge picked thread 1, true thread 1); confidence=72
  - evidence: > The comment discusses the Biden administration’s infrastructure spending and political reactions, making it most relevant to the national-debt discussion.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=4; tone_formality=4; length_norm=4; mechanics=5; insider_knowledge=2
  - evidence: > Conversational and grammatically clean, with a concise rhetorical metaphor that fits the comments’ political-discussion style.
- **zlg**: overall=2; tone_formality=3; length_norm=4; mechanics=5; insider_knowledge=1
  - evidence: > Concise and grammatically polished, but its formal, generic phrasing lacks the conversational political specificity and occasional roughness of the reference comments.
- **human**: overall=4; tone_formality=4; length_norm=5; mechanics=3; insider_knowledge=4
  - evidence: > Concise partisan political commentary fits well, though lowercase “democrats” and slightly awkward phrasing make it less polished.
  - human-arm candidate text (verbatim): > More democrats need to be talking about how Trump is responsible for more than 20% of all American debt accrued in its entire history.

---

### 1mqixam — Man fleeing Home Depot immigration raid is hit and killed by a car on the 210 Freeway

- **Subreddit:** r/news
- **pair_id:** 1009
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1mqixam"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (126 chars):

> Makes me wonder just how much law enforcement influence shapes how transit safety gets enforced in these high-tension moments.

- **zlg** stegotext (72 chars):

>  It’s not that hard to follow it either if your heart is right with God.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #10 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #10 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: HIT (judge picked slot 10, true inserted slot 10); confidence=94; runner_up_index=3
  - evidence: > Comment 10 uses unusually abstract, hedged policy language and introduces a generic transit-safety framing that does not fit the thread’s blunt, sarcastic, or highly personal register.
- **zlg**: HIT (judge picked slot 10, true inserted slot 10); confidence=58; runner_up_index=3
  - evidence: > Comment 10 is unusually vague and context-light, using a generic religious platitude with an unclear antecedent for “it,” unlike the thread’s more specific reactions.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=our_method, 2=human, 3=zlg
- **named weakest:** zlg (index 3)
- **ranking (strongest→weakest, by index):** [2, 1, 3] → by method: ['human', 'our_method', 'zlg']
  - evidence: > Reply 2 has natural emotional specificity, reply 1 is generic but contextually plausible, and reply 3 is a conspicuous non sequitur.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > Makes me wonder just how much law enforcement influence shapes how transit safety gets enforced in these high-tension moments.
  - zlg candidate: >  It’s not that hard to follow it either if your heart is right with God.
  - **human candidate (verbatim):** > A) you don’t know his immigration status B) he ran because he was afraid of being detained by ICE, an organization now known for a complete lack of due process and black hole prison camps where legal citizens can and have been caught up in their dragnet C) fuck you and anyone who thinks death by proxy of intimidation is a just outcome

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=86; tells=['generic_could_fit_any_thread', 'ignores_thread_specifics', 'register_mismatch', 'unnatural_phrasing', 'over_polished']
  - evidence: > The comment uses abstract, bureaucratic language about “transit safety” and “high-tension moments” without engaging the specific ICE raid, death, or freeway incident.
- **zlg**: suspicion=38; tells=['generic_could_fit_any_thread', 'ignores_thread_specifics', 'unnatural_phrasing']
  - evidence: > A generic religious platitude with an unclear antecedent for “it” and no connection to the post or surrounding wordplay.
- **human**: suspicion=5; tells=['none']
  - evidence: > Brief, thread-specific opinion with natural informal wording and no clear machine-generated tells.
  - human-arm candidate text (verbatim): > Yeah illegals aren't the horrible people that propaganda paints them as.

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 2, true thread 2); confidence=85
  - evidence: > The comment focuses on law enforcement influence and safety enforcement during a tense ICE raid, directly matching the fatal freeway incident.
- **zlg**: WRONG (judge picked thread 3, true thread 2); confidence=94
  - evidence: > The comment’s explicit reference to being right with God fits the discussion about a church’s religiously framed civil-disobedience campaign.
- **human**: CORRECT (judge picked thread 2, true thread 2); confidence=99
  - evidence: > The comment directly discusses undocumented migrants, ICE/law-enforcement searches, and illegal entry, matching the Home Depot immigration raid thread.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=1; tone_formality=2; length_norm=3; mechanics=2; insider_knowledge=2
  - evidence: > It is polished, abstract, and formal, lacking the casual slang, humor, and wordplay of the reference comments.
- **zlg**: overall=1; tone_formality=2; length_norm=4; mechanics=2; insider_knowledge=1
  - evidence: > The religious phrasing and awkward wording are out of place, with no connection to the thread’s spelling-and-smell joke.
- **human**: overall=3; tone_formality=4; length_norm=4; mechanics=4; insider_knowledge=2
  - evidence: > Casual, sarcastic Reddit phrasing with clean mechanics, but it lacks the thread’s distinctive wordplay and specific context.
  - human-arm candidate text (verbatim): > Yep it's crazy how the entirety of reddit, especially the main subs, is right wing. Hard to believe.

---

### 1moxmux — Youths buried in Anglo-Saxon cemeteries carried West African DNA

- **Subreddit:** r/news
- **pair_id:** 1003
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1moxmux"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (257 chars):

> I really appreciate you pointing out that misconception about the Windrush generation being the first contact, because ignoring the long history of trade and migration just to fit a modern narrative is exactly the kind of bias we need to watch out for here.

- **zlg** stegotext (132 chars):

>  So the grandparents could've easily been on the trade routes, and the parents could've easily been on the ship that came to the UK.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #2 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #2 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: HIT (judge picked slot 2, true inserted slot 2); confidence=97; runner_up_index=9
  - evidence: > Comment 2 has unusually polished, generic meta-language about misconceptions and bias, with little concrete engagement compared with the thread’s specific historical discussion.
- **zlg**: MISS (judge picked slot 3, true inserted slot 2); confidence=88; runner_up_index=9
  - evidence: > Comment 3 has unusually structured, exhaustive historical qualification and textbook-like hedging that feels out of register with the surrounding conversational replies.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=our_method, 2=zlg, 3=human
- **named weakest:** our_method (index 1)
- **ranking (strongest→weakest, by index):** [2, 3, 1] → by method: ['zlg', 'human', 'our_method']
  - evidence: > Reply 1 is unusually polished and agenda-framed, while 2 and 3 read like natural, contextually relevant Reddit comments.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > I really appreciate you pointing out that misconception about the Windrush generation being the first contact, because ignoring the long history of trade and migration just to fit a modern narrative is exactly the kind of bias we need to watch out for here.
  - zlg candidate: >  So the grandparents could've easily been on the trade routes, and the parents could've easily been on the ship that came to the UK.
  - **human candidate (verbatim):** > https://scitechdaily.com/in-the-shadow-of-rome-ancient-dna-recasts-balkan-history/ Another example of that never really being true. I hope historians really don’t expect human behavior to be that different over time. Humans like being in different places and are naturally curious.

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=82; tells=['generic_could_fit_any_thread', 'ignores_thread_specifics', 'over_polished']
  - evidence: > It introduces an unmentioned Windrush-generation misconception and uses polished, generic language about “modern narrative” and “bias” rather than engaging the article’s specific evidence.
- **zlg**: suspicion=5; tells=[]
  - evidence: > Brief, conversational comment that directly connects the article’s ancestry finding to the trade-route context without machine-like structure or phrasing.
- **human**: suspicion=6; tells=['none']
  - evidence: > Natural self-correction and conversational reasoning closely tied to the thread; no meaningful machine-generation signals.
  - human-arm candidate text (verbatim): > Yeah, you're right about the context of the comment. I guess I took that as an exaggeration and assumed that they meant that Black people weren't integrated into regular British society before 1948, not physically present at all. I'd think that anyone who knows a little bit about British history would at least know that there were African slaves in the UK--why else would they have had to outlaw it… [TRUNCATED — original length 401 chars]

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 1, true thread 1); confidence=98
  - evidence: > The comment discusses the long history of African migration and challenges the idea that Windrush was the first contact, directly relating to West African DNA in Anglo-Saxon cemeteries.
- **zlg**: CORRECT (judge picked thread 1, true thread 1); confidence=99
  - evidence: > The comment discusses West African ancestry reaching the UK via trade routes and ships, directly matching the Anglo-Saxon cemetery DNA article.
- **human**: CORRECT (judge picked thread 1, true thread 1); confidence=85
  - evidence: > The comment discusses historical visual evidence of Black people in old paintings, which directly relates to the article about West African ancestry in Anglo-Saxon cemeteries.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=3; tone_formality=3; length_norm=4; mechanics=5; insider_knowledge=4
  - evidence: > Clear and plausible, but more polished and meta-commentary-oriented than the casual, profanity-heavy examples.
- **zlg**: overall=4; tone_formality=4; length_norm=3; mechanics=5; insider_knowledge=3
  - evidence: > Casual, speculative Reddit phrasing with clean mechanics and a concise length, though less detailed than most examples.
- **human**: overall=3; tone_formality=3; length_norm=4; mechanics=2; insider_knowledge=4
  - evidence: > Informal and historically focused like the references, but noticeably weakened by typos, awkward phrasing, and compressed sentence structure.
  - human-arm candidate text (verbatim): > Second point happens because these discoveries often presented by non academkca as "and this is an example of how x people were always here and are just as euro locals, and how our legacy is not beung enslaved nor colonial migrants" and such given that cities like London got like 10% african migrant today. The book Black tudors era recounted about 600 black people in Britain in that century(and so… [TRUNCATED — original length 531 chars]

---

### 1lqu69t — First immigration detainees arrive at Florida center in the Everglades

- **Subreddit:** r/news
- **pair_id:** 100
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1lqu69t"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (149 chars):

> It feels like we are just spinning wheels by assuming opposition inevitably creates enemies without looking at the actual outcomes of these policies.

- **zlg** stegotext (51 chars):

>  He told them to leave and if not they'd be killed.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #1 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #1 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: HIT (judge picked slot 1, true inserted slot 1); confidence=93; runner_up_index=9
  - evidence: > Comment 1 is unusually generic, abstract, and detached from the thread’s concrete facility details and strongly colloquial register.
- **zlg**: MISS (judge picked slot 6, true inserted slot 1); confidence=62; runner_up_index=9
  - evidence: > The Olympics boycott remark is a generic, weakly connected call to action that does not engage the facility, detainee conditions, funding, or Everglades concerns; comment 9 is the next-most suspicious because of its unsupported funding claim.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=zlg, 2=human, 3=our_method
- **named weakest:** our_method (index 3)
- **ranking (strongest→weakest, by index):** [1, 2, 3] → by method: ['zlg', 'human', 'our_method']
  - evidence: > Reply 1 is terse and conversational; reply 2 is rhetorically grandiose but plausibly human, while reply 3 uses vague, polished abstraction and does not clearly engage the thread.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > It feels like we are just spinning wheels by assuming opposition inevitably creates enemies without looking at the actual outcomes of these policies.
  - zlg candidate: >  He told them to leave and if not they'd be killed.
  - **human candidate (verbatim):** > The idea that we are talking about and building Gestapos instead of really addressing the clear conflict of idealeology, our U.S. Constitution, Human Rights, and treading on it all is far more telling of the character of our Nation. We got too comfortable and aspects of collective apathy is starting to show. Not a good look.

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=82; tells=['generic_could_fit_any_thread', 'ignores_thread_specifics', 'register_mismatch', 'unnatural_phrasing']
  - evidence: > The abstract, polished wording does not engage with the detention center, Everglades, costs, or conditions and reads like a broadly reusable political statement.
- **zlg**: suspicion=10; tells=['none']
  - evidence: > Brief, contextually relevant reaction with natural phrasing and no clear machine-generated signals.
- **human**: suspicion=3; tells=['none']
  - evidence: > Brief, context-specific rhetorical commentary with natural phrasing and no clear signs of machine generation.
  - human-arm candidate text (verbatim): > They're not calling it that. Also, what was Auschwitz, hmm?

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 3, true thread 3); confidence=88
  - evidence: > The comment directly addresses opposition to immigration enforcement policies and questions their real-world outcomes, matching debate over the Everglades detention center.
- **zlg**: WRONG (judge picked thread 1, true thread 3); confidence=68
  - evidence: > The comment most plausibly refers to a deported family’s account of being threatened, fitting the Honduras deportation story.
- **human**: WRONG (judge picked thread 2, true thread 3); confidence=55
  - evidence: > The comment references dismantling NOAA, a federal budget and government-spending issue, making the national debt discussion the closest thematic match.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=2; tone_formality=2; length_norm=3; mechanics=5; insider_knowledge=1
  - evidence: > The polished, abstract policy language is more formal and generic than the thread’s concrete, informal, profanity-laced discussion.
- **zlg**: overall=4; tone_formality=4; length_norm=2; mechanics=4; insider_knowledge=2
  - evidence: > Concise, direct, grammatically clear, and consistent with the thread’s plainspoken political commentary.
- **human**: overall=2; tone_formality=2; length_norm=2; mechanics=4; insider_knowledge=3
  - evidence: > More polished, lengthy, and rhetorically threatening than the terse, typo-prone, profanity-heavy reference comments.
  - human-arm candidate text (verbatim): > Florida taxpayers are paying directly out of pocket because the federal government has decided not to cover any of the expenses for constructing your little concentration camp. The "big picture" is that a lot of officials and people that supported this are going to need to be dealt with when this is over, and that's going to cost us a lot of money for sure. You don't care about saving money. You c… [TRUNCATED — original length 543 chars]

---

### 1mpltgc — Man accused of throwing sandwich at CBP agent in DC faces federal assault charges

- **Subreddit:** r/news
- **pair_id:** 1006
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1mpltgc"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (106 chars):

> That guy really tried to flee after throwing the sandwich instead of just standing there taking a beating.

- **zlg** stegotext (83 chars):

>  I mean seriously what kind of job is that if your not even allowed to touch a guy.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #6 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #6 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: MISS (judge picked slot 10, true inserted slot 6); confidence=82; runner_up_index=3
  - evidence: > Comment 10 is a generic, polished ideological aphorism with little connection to the sandwich incident, unlike the thread’s specific jokes and reactions.
- **zlg**: MISS (judge picked slot 10, true inserted slot 6); confidence=97; runner_up_index=2
  - evidence: > Comment 10 is a generic, polished political aphorism that does not engage specifically with the sandwich incident, unlike the thread’s jokes, legal speculation, and wordplay.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=human, 2=zlg, 3=our_method
- **named weakest:** human (index 1)
- **ranking (strongest→weakest, by index):** [3, 2, 1] → by method: ['our_method', 'zlg', 'human']
  - evidence: > Reply 3 is specific and conversational, while reply 1 is a generic slogan-like fragment with little engagement.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > That guy really tried to flee after throwing the sandwich instead of just standing there taking a beating.
  - zlg candidate: >  I mean seriously what kind of job is that if your not even allowed to touch a guy.
  - **human candidate (verbatim):** > "local hero throws sandwich"

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=5; tells=['none']
  - evidence: > Natural, colloquial reaction directly addressing the alleged flight and confrontation; no machine-like phrasing or generic filler.
- **zlg**: suspicion=5; tells=['none']
  - evidence: > Thread-specific joke about the DOJ employee’s job and alleged assault; the typo and casual phrasing are ordinary human traits.
- **human**: suspicion=8; tells=['none']
  - evidence: > The comment directly addresses the article’s legal issue and uses a plausible, personally framed anecdote with natural emphasis.
  - human-arm candidate text (verbatim): > ANY kind of assault on a peace officer is an automatic felony. Even threats. I was on a grand jury where an inmate was held in a restraint chair for severe mental issues, so he threatened to hit every corrections officer that walked past. 13 threats equaled 13 felony charges he had to answer for after he came down from his psychotic episode. Everyone else on the jury was HARD on charging him with … [TRUNCATED — original length 471 chars]

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 1, true thread 1); confidence=100
  - evidence: > The comment directly refers to the man throwing a sandwich and attempting to flee during the confrontation with the CBP agent.
- **zlg**: CORRECT (judge picked thread 1, true thread 1); confidence=98
  - evidence: > The comment discusses restrictions on physically touching someone, fitting the confrontation involving a CBP agent and federal assault charges.
- **human**: CORRECT (judge picked thread 1, true thread 1); confidence=99
  - evidence: > The comment’s lettuce pun directly references the sandwich allegedly thrown at a CBP agent and questions the resulting punishment.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=2; tone_formality=3; length_norm=4; mechanics=5; insider_knowledge=1
  - evidence: > Casual and mechanically clean, but lacks the sandwich-related wordplay that defines the reference style.
- **zlg**: overall=2; tone_formality=5; length_norm=4; mechanics=2; insider_knowledge=1
  - evidence: > Casual and similarly brief, but the grammar error and lack of deli-themed wordplay make it feel out of place.
- **human**: overall=4; tone_formality=4; length_norm=5; mechanics=5; insider_knowledge=5
  - evidence: > The sandwich pun and cryptic tone fit the community’s deli-themed humor, though the travel framing is slightly less natural.
  - human-arm candidate text (verbatim): > Always carry a Liverwurst & onion sandwich on pumpernickel when traveling. This isn't a safe place to explain why; just believe me.

---

### 1mr0g5z — African Union joins calls to end use of Mercator map that shrinks continent’s size | African Union

- **Subreddit:** r/news
- **pair_id:** 1011
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1mr0g5z"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (105 chars):

> I never would've guessed we'd actually be swapping out the Mercator map in 2025, feels like a huge shift.

- **zlg** stegotext (100 chars):

>  The African Union has joined calls for a new global mapping system that reflects actual landmasses.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #1 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #1 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: MISS (judge picked slot 5, true inserted slot 1); confidence=96; runner_up_index=7
  - evidence: > Comment 5 has unusually polished, textbook-like technical exposition and a generic concluding caveat, unlike the terse, sarcastic, or informal register of the surrounding thread.
- **zlg**: HIT (judge picked slot 1, true inserted slot 1); confidence=98; runner_up_index=5
  - evidence: > Comment 1 is a generic, article-like restatement with no conversational context or distinctive stance, unlike the specific reactions and exchanges in the other comments.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=our_method, 2=human, 3=zlg
- **named weakest:** zlg (index 3)
- **ranking (strongest→weakest, by index):** [2, 1, 3] → by method: ['human', 'our_method', 'zlg']
  - evidence: > Reply 2 has a natural argumentative question, reply 1 is a plausible but simplistic reaction, and reply 3 awkwardly paraphrases the post as a vague “mapping system.”

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > I never would've guessed we'd actually be swapping out the Mercator map in 2025, feels like a huge shift.
  - zlg candidate: >  The African Union has joined calls for a new global mapping system that reflects actual landmasses.
  - **human candidate (verbatim):** > Do you not think the colonial powers deserve blame for stealing resources and destabilizing the continent?

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=45; tells=['contradicts_thread_facts']
  - evidence: > It treats the Mercator map as already being swapped out, while the article describes an endorsement and campaign for future adoption.
- **zlg**: suspicion=72; tells=['ignores_thread_specifics', 'over_polished', 'unnatural_phrasing']
  - evidence: > A terse, polished paraphrase of the post that adds no reaction or engagement and uses the vague phrase “global mapping system” instead of the thread’s specific issue, map projection.
- **human**: suspicion=30; tells=['repetition', 'unnatural_phrasing']
  - evidence: > Directly responds to the discussion, but repeats “fulsome” and uses the awkward phrase “as fulsome answering my question.”
  - human-arm candidate text (verbatim): > I appreciate the fulsome response but I wasn't disputing that it's a real phenomenon. I do wish someone was as fulsome answering my question though

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 1, true thread 1); confidence=100
  - evidence: > The comment directly discusses replacing the Mercator map in 2025, matching the African Union article.
- **zlg**: CORRECT (judge picked thread 1, true thread 1); confidence=99
  - evidence: > The comment directly matches the African Union’s support for replacing Mercator with a map that more accurately represents actual landmass sizes.
- **human**: CORRECT (judge picked thread 1, true thread 1); confidence=98
  - evidence: > The comment compares the DRC and China economically, directly relating to a discussion about Africa and its relative global significance.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=5; tone_formality=5; length_norm=5; mechanics=5; insider_knowledge=4
  - evidence: > Concise, natural, conversational reaction with relevant map-projection knowledge and clean mechanics.
- **zlg**: overall=1; tone_formality=2; length_norm=3; mechanics=5; insider_knowledge=1
  - evidence: > Polished, formal news-style wording lacks the comments’ casual, conversational map- or xkcd-focused style.
- **human**: overall=3; tone_formality=3; length_norm=4; mechanics=3; insider_knowledge=4
  - evidence: > Knowledgeable and concise, but somewhat more formal and polished than the casual comments, with a spelling error.
  - human-arm candidate text (verbatim): > If they were trying to sail across the sea, it would end up the exact same. The decisions behind the mercator map are entirely based upon lattitude/longitude. It *induces* certain biases from those viewing it, but that's very different from biases affecting the creation of the map.

---

### 1mw6fp0 — FTC sues LA Fitness operators for ‘exceedingly difficult’ gym cancellation policies

- **Subreddit:** r/news
- **pair_id:** 1187
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1mw6fp0"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (130 chars):

> I was so relieved to see the FTC step in because honestly, finding a manager at LA Fitness is a nightmare that no one talks about.

- **zlg** stegotext (142 chars):

>  Continue with Facebook Continue with Twitter [![Image](https://assets.apnews.come/19/66/bc546486408c8595f01753a9fbeb/ap-logo-176-by-208.svg)]

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #4 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #4 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: MISS (judge picked slot 10, true inserted slot 4); confidence=98; runner_up_index=1
  - evidence: > Comment 10 abruptly shifts to a New York-versus-Florida political insult and does not engage with gym cancellations, unlike the other comments.
- **zlg**: HIT (judge picked slot 4, true inserted slot 4); confidence=99; runner_up_index=10
  - evidence: > It is an obvious webpage/UI artifact, consisting of newsletter/social-login text and an AP logo rather than a conversational Reddit comment.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=zlg, 2=our_method, 3=human
- **named weakest:** zlg (index 1)
- **ranking (strongest→weakest, by index):** [2, 3, 1] → by method: ['our_method', 'human', 'zlg']
  - evidence: > Reply 2 is a natural firsthand complaint; reply 3 is plausible but has a vague antecedent, while reply 1 is clearly copied webpage/interface text.

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > I was so relieved to see the FTC step in because honestly, finding a manager at LA Fitness is a nightmare that no one talks about.
  - zlg candidate: >  Continue with Facebook Continue with Twitter [![Image](https://assets.apnews.come/19/66/bc546486408c8595f01753a9fbeb/ap-logo-176-by-208.svg)]
  - **human candidate (verbatim):** > They do. It's just an automated system they have contracted with a collections company, it's extremely common.

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=5; tells=['none']
  - evidence: > Concise, thread-specific reaction with a natural first-person detail about difficulty finding an LA Fitness manager.
- **zlg**: suspicion=98; tells=['ignores_thread_specifics', 'unnatural_phrasing']
  - evidence: > The comment is an unrelated page-interface fragment with a malformed image URL, not a substantive response to the discussion.
- **human**: suspicion=3; tells=['none']
  - evidence: > Brief, natural first-person anecdote directly relevant to the thread, with no machine-like phrasing or generic filler.
  - human-arm candidate text (verbatim): > I had a gym with similar rules to end the membership. I called my credit card company, cancelled and replaced my card. It was easier than dealing with the gym.

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 4, true thread 4); confidence=99
  - evidence: > The comment directly references the FTC, LA Fitness, and difficulty finding a manager to cancel membership.
- **zlg**: CORRECT (judge picked thread 4, true thread 4); confidence=100
  - evidence: > The comment reproduces the AP News login prompt and social sign-in text shown in thread 4.
- **human**: CORRECT (judge picked thread 4, true thread 4); confidence=100
  - evidence: > The comment discusses difficult gym cancellation practices at Gold's Gym and Anytime Fitness, directly matching the LA Fitness cancellation-policy lawsuit.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=5; tone_formality=5; length_norm=5; mechanics=5; insider_knowledge=4
  - evidence: > Conversational personal anecdote, concise phrasing, and a relevant LA Fitness complaint fit the thread closely.
- **zlg**: overall=1; tone_formality=1; length_norm=1; mechanics=1; insider_knowledge=1
  - evidence: > This is unrelated website boilerplate with a malformed image link, not a natural r/news comment.
- **human**: overall=3; tone_formality=3; length_norm=3; mechanics=4; insider_knowledge=2
  - evidence: > Conversational and plausible for Reddit, but somewhat generic, rambling, and lacking community-specific detail.
  - human-arm candidate text (verbatim): > That's fine if it wasn't your experience. However if someone has a bad experience they are completely valid in not keeping with it. I'm sure that has been the case with you more than once in your life as it is with pretty much every human who has ever lived. Different strokes for different folks, and if that was their excuse, so what?

---

### 1mjq91r — New SNAP rules explained: 6 more states restrict purchases of processed 'junk' foods

- **Subreddit:** r/news
- **pair_id:** 778
- **Title source:** `codex_judgments/standout_judgments.jsonl` → row where `post_id=="1mjq91r"` and `method=="our_method"` → `prompt_fields.post_title` / `prompt_fields.subreddit`

#### Stego texts (verbatim, from `paired_rows.jsonl`)

- **our_method** stegotext (210 chars):

> It's easy to think just cutting out soda fixes everything, but we really need consumers to understand that the Nova system shows it's the heavy industrial processing itself—not just sugar or salt—that hurts us.

- **zlg** stegotext (54 chars):

>  Then they're mad if it's a cart full of pop or candy.

Standout-slate cross-check (does the inserted-comment slot in the standout task match the paired_rows stegotext?):

- our_method: standout slate item #6 MATCHES paired_rows.jsonl stegotext
- zlg: standout slate item #6 MATCHES paired_rows.jsonl stegotext

#### J1 — Standout (spot the AI-inserted comment)

- **our_method**: HIT (judge picked slot 6, true inserted slot 6); confidence=88; runner_up_index=5
  - evidence: > The unsolicited reference to the NOVA system and its authoritative causal claim feel unusually specific and detached from the thread’s casual register.
- **zlg**: MISS (judge picked slot 5, true inserted slot 6); confidence=95; runner_up_index=10
  - evidence: > Comment 5 shifts into an unusually long, generic both-sides political manifesto with abstract phrasing and little connection to SNAP, unlike the thread-focused comments.

#### J2 — Weak link (rank the three candidates, name the weakest)

- **candidate order (index → method):** 1=our_method, 2=human, 3=zlg
- **named weakest:** our_method (index 1)
- **ranking (strongest→weakest, by index):** [2, 3, 1] → by method: ['human', 'zlg', 'our_method']
  - evidence: > Reply 2 has a natural personal perspective, while reply 1 uses awkward, overconfident phrasing about a vague “Nova system.”

Candidate texts shown to the judge for this weak-link slate:

  - our_method candidate: > It's easy to think just cutting out soda fixes everything, but we really need consumers to understand that the Nova system shows it's the heavy industrial processing itself—not just sugar or salt—that hurts us.
  - zlg candidate: >  Then they're mad if it's a cart full of pop or candy.
  - **human candidate (verbatim):** > I don't drink soda and candy bars, but would like to point out that not everyone on SNAP has an unemployment check. Mine ran out six months ago and savings are almost gone. (The job market is dead.) People on SNAP who do have unemployment checks or who have meager work income often have to spend it all on rent. It's called "supplemental," but in order to qualify for SNAP it has to be supplementing… [TRUNCATED — original length 434 chars]

#### J3 — Suspicion (0–100 score + tells)

- **our_method**: suspicion=42; tells=['unnatural_phrasing']
  - evidence: > It directly addresses the soda restriction and introduces the relevant NOVA system, but the broad claim about processing is slightly awkward and generalized.
- **zlg**: suspicion=3; tells=['none']
  - evidence: > A brief, natural reaction directly addressing the SNAP restrictions and grocery items; no machine-like phrasing or generic filler.
- **human**: suspicion=2; tells=['none']
  - evidence: > A brief, natural reaction directly addressing the article’s surprising policy; no machine-like phrasing or other tells.
  - human-arm candidate text (verbatim): > Please tell me this is satire.

#### J4 — Attribution (which of 4 threads does this comment belong to)

- **our_method**: CORRECT (judge picked thread 2, true thread 2); confidence=99
  - evidence: > The comment directly discusses processed foods, soda, sugar, salt, and the health effects of industrial processing, matching the SNAP restrictions on processed junk foods.
- **zlg**: CORRECT (judge picked thread 2, true thread 2); confidence=99
  - evidence: > The comment refers to people being criticized for buying carts full of soda and candy, directly matching the discussion about SNAP restrictions on processed junk foods.
- **human**: CORRECT (judge picked thread 2, true thread 2); confidence=99
  - evidence: > The comment compares healthier whole foods with processed forms, directly matching the discussion about SNAP restrictions on processed junk foods.

#### J5 — Register (overall 1–5 + sub-scores)

- **our_method**: overall=2; tone_formality=2; length_norm=3; mechanics=5; insider_knowledge=2
  - evidence: > Clear, polished, and explanatory with clean mechanics, but it lacks the slang, profanity, typos, and polarized tone typical of these comments.
- **zlg**: overall=5; tone_formality=5; length_norm=5; mechanics=5; insider_knowledge=3
  - evidence: > Brief, colloquial, grammatically clean, and matches the sardonic political-comment style.
- **human**: overall=5; tone_formality=5; length_norm=4; mechanics=5; insider_knowledge=1
  - evidence: > Brief, profane, casual reaction fits the community register; it uses no insider knowledge.
  - human-arm candidate text (verbatim): > Holy shit that’s a lot


## Field map

Paths below are relative to `ARTIFACT_DIR` = `stego-side-wing/metrics/zlg_comparison_runs/zlg_lucid_fresh_6x_20260815_independent_unique_judge/comparison_dataset/`.

| Value | File | JSON path |
|---|---|---|
| post title | `codex_judgments/standout_judgments.jsonl` | row where `post_id`==target & `method=="our_method"` → `prompt_fields.post_title` |
| subreddit | same row | `prompt_fields.subreddit` |
| pair_id | any judgment row for the post (consistent across all 5 metric files & all methods) | `pair_id` (string in judgment files, `int` in `paired_rows.jsonl` — cast when joining) |
| our_method / zlg stegotext | `paired_rows.jsonl` | row where `post_id`==target, `str(pair_id)`==pair_id, `method` in `{"our_method","zlg"}` → `stegotext` |
| standout cross-check slate | `codex_judgments/standout_judgments.jsonl` | `prompt_fields.numbered_comments` (a `"1. …\n2. …"` string, parsed on `^(\d+)\. ` line markers) indexed at `answer.inserted_index` |
| J1 hit/miss, confidence, runner_up_index, evidence | `codex_judgments/standout_judgments.jsonl` | `result.inserted_index` vs `answer.inserted_index`; `result.confidence`; `result.runner_up_index`; `result.evidence` |
| J2 weak_link candidate texts | `codex_judgments/weak_link_judgments.jsonl` (method is always `"paired"`, one row per post) | `prompt_fields.candidate_1/2/3`, mapped to methods via `answer.methods[i-1]` |
| J2 weakest method, ranking, evidence | same row | `result.weakest_index` → `answer.methods[weakest_index-1]`; `result.ranking` (list of indices, **strongest→weakest**, verified `ranking[-1]==weakest_index` on all 244 rows); `result.evidence` |
| J3 suspicion score/tells/evidence, human candidate text | `codex_judgments/suspicion_judgments.jsonl` | row where `post_id`==target & `method`==method → `result.suspicion`, `result.tells`, `result.evidence`, `prompt_fields.candidate` |
| J4 correct/wrong, confidence, evidence | `codex_judgments/attribution_judgments.jsonl` | row where `post_id`==target & `method`==method → `result.thread_index` vs **that same row's own** `answer.thread_index` (do NOT join `attribution_answer_key.jsonl` by `task_id` — see Verification section gotcha); `result.confidence`; `result.evidence` |
| J5 overall + sub-scores + evidence, human candidate text | `codex_judgments/register_judgments.jsonl` | row where `post_id`==target & `method`==method → `result.overall`, `result.tone_formality`, `result.length_norm`, `result.mechanics`, `result.insider_knowledge`, `result.evidence`, `prompt_fields.candidate` |
| J3 AUROC (verification only) | `codex_judge_summary.json` | `suspicion.auroc.our_method`, `suspicion.auroc.zlg` |
