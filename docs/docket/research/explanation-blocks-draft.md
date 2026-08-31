# Explanation blocks (draft)

AFK groundwork for docket ticket 08. Mechanics only: what each judge criterion asked, how its slate was built, how the table number is computed, and its direction/chance. Justification blocks (why a number came out the way it did) are a separate session's work and are deliberately absent here.

---

## J1 standout

### Panel copy

The judge sees one method's stego comment slipped into a ten-comment thread alongside nine real human comments, and must name which comment slot is machine-generated. Our method and ZLG never share a slate: each gets its own separate ten-way task, though both use the same nine human distractors and the same insert slot for a given pair. The table cell is how often the judge's guess matches that method's actual slot, out of that method's own 244 tasks. Lower is better. Chance is 10% (one slot in ten). Read it as two parallel single-method tests, not a shared contest.

### Long form

**What the judge saw.** One ten-comment thread slate containing nine real human comments and, at one fixed slot, a single stego comment from one method. The judge is told nine of the ten are genuine and one is machine-generated, and returns the slot number it believes is the fake, plus a confidence rating and a runner-up guess.

**How the slate was built.** A seeded random draw pulls up to nine human comments from the same thread and fixes one insert position. That draw, including the position, is reused for both methods on a given pair: our method's stego comment and ZLG's stego comment are each inserted at the same slot into two otherwise identical human comment sets. This produces two separate ten-way tasks per pair, one per method, not one task where the two methods compete against each other.

**How the number is computed.** For a given method, take every standout task run for that method that has both a judge answer and the true slot recorded. The table cell is the fraction of those tasks where the judge's chosen slot (`inserted_index`) matches the true slot, shown as a percentage to one decimal place. The denominator is that method's own task count, 244 on the frozen evaluation set, not a combined or shared total across methods.

**Direction and chance.** Lower is better: a correct guess means the judge spotted the fake. Chance performance is 10%, since the fake could sit in any of ten slots.

**Easy to misread as:** a single ten-way slate with both methods competing side by side. It is not. Each method is tested in its own slate, and the two slates are linked only by sharing the same nine human distractors and the same insert position.

---

## J2 weak-link

### Panel copy

The judge sees three anonymized replies for the same pair, shuffled into random order: one held-out human comment, our method's stego comment, and ZLG's stego comment. It ranks all three from most to least human-sounding and names the weakest. All three arms sit in the same slate, so this is a genuine three-way task, unlike J1. The table cell is a pick rate: how often a given method was named weakest, counted over 244 shared slates, not over a per-method task count. Lower is better. Chance is 33% (one of three), and a human comment sits in every slate.

### Long form

**What the judge saw.** Three replies to the same thread, shuffled and unlabeled: one real human comment held out from the thread, our method's stego comment, and ZLG's stego comment. The judge ranks all three from most to least plausible as a genuine reply and separately names the weakest of the three.

**How the slate was built.** One task per pair, not one per method. A seeded random draw holds out a human comment from the thread, shuffles the three candidates into `candidate_1`, `candidate_2`, `candidate_3`, and shows five other real comments from the same thread as context alongside the post title and body. The same slate always contains all three arms: human, our method, ZLG.

**How the number is computed.** The table reads every weak-link task that has both a judge answer and the true candidate-to-method mapping, and checks which method sits at the position the judge named as weakest (`weakest_index`). The cell for a method is the fraction of the 244 shared slates where that method was picked weakest. The denominator is the slate count, not a per-method task count, since one slate produces one weakest-index answer that is shared across all three arms.

**Direction and chance.** Lower is better: being picked weakest more often is the worse outcome. Chance is 33% (one of three candidates). The human comment appears in every slate, functioning as a constant control arm.

**Easy to misread as:** a rate out of some per-method task total, for example 244 tasks per method or 488 combined. It isn't. There are 244 slates total, each shared by all three arms, and the percentages for our method, ZLG, and the human control are three ways of dividing up the same 244 outcomes.

---

## J3 suspicion

### Panel copy

The judge sees one comment at a time, without knowing which method, or whether a human, wrote it, and scores it 0 (reads as genuine) to 100 (reads as machine-generated), told not to treat bluntness or typos as evidence. The table cell is not an average of those scores. It is an AUROC: every one of a method's scores is compared against every held-out human score, counting wins and ties, to see how well the scores separate that method from humans by rank. Lower AUROC means closer to the human score distribution. Chance-level separation is an AUROC of 0.5.

### Long form

**What the judge saw.** One candidate comment shown on its own, with the same post fields and thread context used across the other criteria, and asked to return a single suspicion score from 0 (reads as genuine human writing) to 100 (reads as machine-generated or edited), plus any applicable tell labels. The judge does not see the other candidates side by side; each is scored in isolation.

**How the slate was built.** Three separate pointwise tasks per pair: our method's stego comment, ZLG's stego comment, and one human comment held out from the thread, each scored on its own. The three tasks share the same post fields and the same five context comments, with the held-out human excluded from that context.

**How the number is computed.** The table does not average `suspicion` scores. It computes an AUROC: for every pair of one method score and one held-out human score, count 1 if the method score is higher (more suspicious), 0.5 if tied, 0 if lower, then divide by the total number of such comparisons. On the frozen evaluation set that is 244 method scores against 244 human scores, so every method's AUROC is built from 244 × 244 pairwise comparisons.

**Direction and chance.** Lower AUROC is better here: it means the method's scores rank closer to, or below, the human scores rather than consistently ranking above them. Chance-level separation, where the method's scores and the human scores are indistinguishable by rank, is an AUROC of 0.5.

**Easy to misread as:** a mean suspicion score out of 100, since the prompt does return a 0-100 number per comment. The table cell is not that mean. It is a rank-based comparison against the human arm, and a method's average suspicion score and its AUROC can move independently depending on how its scores overlap with the human distribution.

---

## J4 thread attribution

### Panel copy

The judge sees one candidate comment and four short thread blurbs (subreddit, title, and a body snippet), three decoy posts plus the true one in shuffled order, and picks which thread the comment belongs to, told to guess if unsure. A human comment runs through the same four-thread slate as a third arm, but the table shows only the two method columns. The cell is a per-method accuracy: how often that method's comment was matched to its correct thread. Higher is better. Chance is 25% (one of four).

### Long form

**What the judge saw.** One candidate comment on its own, plus four thread blurbs, each a subreddit name, post title, and a body snippet truncated to 700 characters. The judge returns which of the four blurbs it thinks the comment came from, told to guess if uncertain, along with a confidence rating.

**How the slate was built.** A seeded random draw pulls three other posts, preferring the same subreddit when at least three are available, adds the true post, and shuffles all four into position. The same four-thread slate is reused for three separate tasks per pair: our method's stego comment, ZLG's stego comment, and one random human comment, each scored against the identical four options.

**How the number is computed.** For each method, the cell is the fraction of that method's attribution tasks where the judge's chosen thread (`thread_index`) matches the true post's position. The denominator is that method's own task count, 244 on the frozen evaluation set, one task per pair. A human-arm accuracy is computed the same way from the human tasks in the slate, but it is not one of the two displayed columns.

**Direction and chance.** Higher is better here: a correct match means the comment carries recoverable thread-specific content. Chance is 25% (one of four blurbs). Every slate in this run drew four same-subreddit titles, so guessing from subreddit identity alone would not lift a score above chance.

**Easy to misread as:** a table that already accounts for how a human-written comment does on the same task, since a human arm exists in every slate. It doesn't. The human arm is scored and stored, it just isn't one of the two columns shown.

---

## J5 register

### Panel copy

The judge sees five genuine comments from the same subreddit as style references, then rates the candidate comment's style on four sub-scores plus an `overall` fit score, 1 (out of place) to 5 (indistinguishable from a native comment). The table cell is a plain mean of the `overall` scores across a method's tasks, shown to three decimal places. It does not fold in the four sub-scores. Higher is better. There is no chance-guessing baseline the way J1 through J4 have one, but a human-written comment run through the same task averages 3.402 on `overall`, which anchors the top of the scale.

### Long form

**What the judge saw.** Five genuine comments from the same subreddit, shown as style references, before the judge rates one candidate comment on `tone_formality`, `length_norm`, `mechanics`, `insider_knowledge`, and `overall`, each on a 1 (out of place in this subreddit) to 5 (indistinguishable from a native comment) scale.

**How the slate was built.** The same pointwise construction as J3 suspicion: three separate tasks per pair, one each for our method's stego comment, ZLG's stego comment, and a held-out human comment, each scored against the same five style references and thread context.

**How the number is computed.** The table cell is the arithmetic mean of the `overall` field across a method's register tasks that returned a numeric score, shown to three decimal places. The four sub-scores (`tone_formality`, `length_norm`, `mechanics`, `insider_knowledge`) exist on every judgment but are not averaged into this cell. The denominator is that method's own task count with a numeric `overall`, 244 on the frozen evaluation set. A separate paired comparison of the two methods' scores against each other, post by post, exists elsewhere in the scoring output; it does not feed this cell either.

**Direction and chance.** Higher is better. J5 has no identification-style chance rate to compare against, since the judge is scoring style fit rather than guessing an answer. The nearest thing to a baseline is the human arm: human-written comments run through the same task average 3.402 on `overall`. That figure lives in the human-arm judgment data, not in the same summary file as the two method columns, and it is not itself one of the two displayed columns.

**Easy to misread as:** a composite style score built from all five fields. It's the mean of `overall` alone. The sub-scores are there to read individually if wanted, they just don't move this particular number.

---

## Notes for the spec session

- **Dedup flag.** CONTEXT.md files "direction and chance / human anchor" under Interpretation, and the live table already has a rightmost Interpretation column carrying exactly that. Every block above repeats the chance/anchor fact (10%, 33%, 0.5, 25%, 3.402) because the task asked for it, but in the shipped UI this will likely read as redundant next to that existing column. Flagging rather than deciding: whether the Explanation block should drop the chance line and just point at the Interpretation column, or keep a short cross-reference, is a spec-session call.

- **Field-name density is inconsistent on purpose, needs a house style.** I named JSON fields (`inserted_index`, `weakest_index`, `thread_index`, `overall`, `suspicion`/AUROC) in every long-form block since the research note names them, but only pulled a couple into panel copy (J1's slot match, J5's `overall`) and paraphrased the rest for a first-time reader. This wasn't a principled rule, it was word-budget triage. The spec session should decide whether panel copy names fields at all or stays fully in plain language, and apply that consistently across J1-J5 rather than per-criterion judgment calls like mine.

- **J3's "244 × 244" is my arithmetic, not a quoted note figure.** The research note says the AUROC is built from "244 × 244 pairwise comparisons" on a complete run; I used that multiplication as stated rather than reducing it further (e.g. to 59,536), on the theory that showing the two factors is more legible to a reader than the product. Worth a second look in the spec session.

- **J5's sign-test mention is deliberately gutted.** CONTEXT.md's J5 entry says "only J5 has a paired sign-test in the scoring artifact" as a mechanics fact, so I kept a bare mention that a separate paired comparison exists and isn't part of this cell. I left out its result (wins/losses/ties, p-value) because those are outcome numbers from the results table, which is out of scope here. If the spec session wants the existence-of-a-sign-test line at all, it's there; if it reads as foreshadowing the justification, cut it.

- **244 as a denominator, not a "score."** The instructions ban results-table scores except the five named chance/anchor constants, but every criterion's mechanics turn on stating the denominator, and the denominator is the frozen evaluation-set size (244 pairs/tasks/slates, from CONTEXT.md's Evaluation set section), not a per-method outcome. I treated 244 as fair game throughout on that basis. Flagging in case the spec session wants denominators phrased without the literal number (e.g. "the full evaluation set" instead of "244").

- **Nothing here needed the JSONL artifacts or the frozen-run report's actual numbers.** Everything above traces to `docs/docket/CONTEXT.md` and `docs/docket/research/what-each-criterion-measures.md`; I did not open `codex_judge_summary.json`, `register_judgments.jsonl`, or the 2026-08-29 results report, per the task's instruction to stay off the artifacts.

- **Ambiguity found, resolved conservatively.** The research note doesn't fully spell out whether J3's held-out human score set is shared between the two methods' AUROC computations (i.e., is it the same 244 human scores for both our-method-vs-human and ZLG-vs-human AUROC, or two separate human draws). I wrote the long form assuming a shared human-score set, since the pointwise slate construction (`build_pointwise`) draws one human comment per pair alongside both methods, which reads as one shared held-out arm. If that's wrong, the "244 × 244 comparisons" line and the "same set of 244 human scores" framing in J3 long form need correcting.
