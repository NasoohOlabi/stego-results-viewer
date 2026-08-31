# Docket

Language for explaining and justifying the five independent LLM-judge criteria on `/zlg-comparison`.

## Methods

**Our method**:
The selection-channel system in `stego-side-wing` that hides a payload by choosing visible linguistic options (parent, angle, comment text). In the judge table this is the left column.
_Avoid_: LUCID (a data/project name, not the method), “we”, “ours” as a proper name in specs

**ZLG**:
The NAACL’24 Zero-shot Generative Linguistic Steganography baseline (live service in `zero-shot-GLS`). In the judge table this is the right column.
_Avoid_: CLG, “the baseline” when ZLG is meant

## Judge criteria

**Explanation**:
What a criterion asks the judge to do, how the table number is computed, and what chance or a human anchor means.
_Avoid_: mixing this with why a method won or lost

**Justification**:
Why this method’s number came out this way, argued from mechanism and examples, including an explicit opinion.
_Avoid_: Interpretation (direction and chance only)

**Interpretation**:
Whether higher or lower is better, and the chance or human-anchor baseline. Already the rightmost table column.
_Avoid_: using this word for the longer why-it-happened story

**J1 standout**:
Two separate 10-comment slates that share the human distractors and insert slot: nine humans plus one method’s stego comment. The table number is how often that method’s comment was correctly named. Lower is better. Chance is 10%. Not a head-to-head on one slate.

**J2 weak-link**:
One shuffled triple per pair (human, our method, ZLG). The table number is how often that method was named weakest across 244 shared slates, not a per-method task count. Lower is better. Chance is 33%. The human control is in every slate.

**J3 suspicion**:
A pointwise 0–100 score, then unpaired AUROC of those scores against the human arm (every method score × every human score). The table cell is that AUROC from `codex_judge_summary.json`, not the mean suspicion. Lower is closer to the human distribution. Chance AUROC is 0.5.

**J3 tell**:
A prompt-listed reason label on a suspicion judgment (`over_polished`, `ignores_thread_specifics`, and the rest, or `none`). Distinct from the 0–100 score. Any-tell *rate* is not the same fact as which labels fire.

**J4 thread attribution**:
A 4-way choice: which of four thread blurbs the comment belongs to. In this run every slate is four same-subreddit (`r/news`) titles, so subreddit identity cannot explain accuracy. Higher is better. Chance is 25%. A human arm is scored; the table cell does not use it.

**J5 register**:
A 1–5 `overall` style-fit mean against genuine comments from the same subreddit. Higher is better. The human-arm mean is 3.402 in `register_judgments.jsonl`, not in `codex_judge_summary.json`. Sub-scores exist on the judgment and are not the table cell. Among J2/J4/J5, only J5 has a paired sign-test in the scoring artifact.

## Detection accounts

Competing explanations for why a criterion catches a method. Naming them separately keeps
"what the judge said" apart from "what we think is really happening."

**Slate composition**:
The makeup of the nine human distractors in a J1 slate — their lengths, registers, and spread — as opposed to any property of the inserted comment itself. An account that appeals to slate composition says the insert was caught because of the company it kept.
_Avoid_: "context" (overloaded), "the thread" (the distractors are only part of it)

**Relative length**:
The inserted comment's word count expressed against its own slate: its rank among the ten, or its ratio to the slate median. The claim "our comments are long" is only meaningful in this relative form, because human length varies enormously between slates.
_Avoid_: comparing raw mean word counts across arms as if that settled anything

**Stranded reply**:
A comment written to answer a parent comment, then presented in a flat list of siblings where that parent is not visible. It carries uptake markers ("Exactly,", "you pointing out", a demonstrative) whose antecedent the reader cannot find.
_Avoid_: "off-topic" (a stranded reply is usually firmly on topic), "incoherent"

**Same-thread distractors**:
Every J1 slate draws all nine distractors from the same post as the insert. J1 never mixes threads; J4 is the criterion that does. Any account of J1 that appeals to a comment sitting in the wrong thread is describing J4.
_Avoid_: reasoning about J1 as if its distractors came from other posts

## Surfaces

**Judge table**:
The five-row full-run comparison on `/zlg-comparison`. Carries the number, the direction, and the chance or anchor level, and nothing longer.

**Justification page**:
The dedicated per-criterion surface holding that criterion's argument, examples, and stated opinion, reached from its row in the judge table. The argument lives here rather than inline, so the table stays scannable.
_Avoid_: "explainer panel", "tooltip", "accordion" — those name mechanisms, and the decision was a page

## Evaluation set

**Independent judge run**:
The frozen 244-pair subset (`zlg_lucid_fresh_6x_20260815_independent_unique_judge`) used for the table: one pair per post, unique ZLG covers only. Not the full 1,608-pair source pool.
