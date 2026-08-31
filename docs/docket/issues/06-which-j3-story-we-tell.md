# Which J3 story we tell

Type: grilling
Status: resolved
Blocked by: 01, 03, 11

## Question

Given the J3 distributions and tells, which justification do we lock for the viewer?

Constraint from [Whether J3 is insensitive](../research/whether-j3-is-insensitive.md) — do not re-litigate these:

- The AUROCs match the raw distributions (medians both 12; method-vs-method AUROC 0.50). This is not AUROC compressing two different shapes.
- They are bimodal (low clump at 3–12 plus a high tail), not a mid-band of “slightly machine-y.”
- p=0.385 is a sign test on paired raw scores, not a test of AUROC difference.
- Unique-ZLG / AUROC-vs-human did not hide a method-vs-method gap: direct AUROC is 0.50; per-post |Δ| is large and cancels.
- J1 on the same posts still splits them, including 34.9% vs 12.3% inside the J3 [0,10) bin. J5 on the same pointwise slate also separates them.
- Tell *rates* are similar (~41–44%); the *mix* is not (our method `over_polished` 15% vs ZLG 3%).

Live choice: (a) call J3 under-sensitive as a *method-level separator vs human* and say so, (b) treat the tie on rank-vs-human as a real finding (both look human-like at similar rates), (c) demote J3 (footnote, not a headline comparison), or a combination. The viewer must not present two near-identical AUROCs as a close race without that opinion.

## Answer

**Locked 2026-08-30**, combining (a) and (b) from the live choice, with one mandatory softening the
adversarial pass (ticket 11) forced.

1. **It is a real tie.** On isolated "is this machine-written?" scoring, the two methods rank alike
   against humans. Every attack strengthened this rather than weakening it.
2. **J3 is under-sensitive as a method-level separator.** Both arms are bimodal, the 0-100 scale is
   used as a two-mode switch (no tell ~8, any tell 52-72), and J1 on the same posts still splits
   them 51.6% vs 28.3%, including 34.9% vs 12.3% inside J3's own human-like [0,10) bin.
3. **Mechanism, now quantified.** Both methods reach the high-suspicion mode at nearly the same
   rate (101 vs 108 of 244) through **different tells**: ours via `over_polished` (37 vs ZLG's 7),
   ZLG via `ignores_thread_specifics`, `repetition`, and fact contradiction. Same alarm rate,
   different doors. That is why the AUROCs tie.
4. **Mandatory softening.** Stop presenting **0.661 vs 0.650** as an ordering. The gap is 0.0109
   against a 0.089 tie-convention swing, and the ordering reverses in 33.3% of bootstrap resamples
   (difference CI -0.039 to +0.064). Report both arms as ~0.66 and state they are indistinguishable.
   Reporting the third decimal as if it ranked the methods would be the panel's own version of the
   error we criticise elsewhere.

J3 stays in the table; it is not demoted to a footnote. The opinion travels with it.

### Amended 2026-08-30 after the qualitative pass (ticket 11)

Point 2 was over-broad as first written and the shipped copy has been corrected.

- **"Blunt" is the wrong word and is now removed from the page.** An AUROC of 0.66 sits well above
  the 0.5 chance line, so J3 separates machine text from human text perfectly well. Scope the
  insensitivity to the method-vs-method margin every time it is stated, and say what 0.66 means
  before presenting the tie as a failure, so a reader does not take it as a broken instrument.
- **The tie is mostly genuine agreement, not coincidence.** Of ten near-identical pairs, seven are
  clean matches where the judge reached the same score for the same reasons. One is coincidence and
  must never be used as a flagship example.
- **New limit, now on all five pages:** the judge's rationale is its own sentence, not a guaranteed
  transcript. In 50 audited judgments, 5 had a reason label disagreeing with the rationale and 2 had
  a rationale that did not describe the comment it was given.
