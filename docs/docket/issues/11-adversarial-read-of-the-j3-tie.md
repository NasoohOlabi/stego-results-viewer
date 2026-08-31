# Adversarial read of the J3 tie

Type: research
Status: resolved

## Question

Ticket 03 concluded the 0.661 vs 0.650 AUROC tie is real and that J3 is blunt as a method-level
separator. The team intends to publish both halves of that claim. Before it goes on a page, attack it.

Specifically test whether:

- The tie is an artifact of **score heaping**. The judge reuses a handful of integers (8, 3, 5, 12).
  If the 0.011 gap sits inside tie-breaking noise, "real tie" is trivially true and over-precise.
  Bootstrap a confidence interval for each AUROC and check whether the ordering flips.
- The **shared human negative pool** is doing the work. Both methods are ranked against the same
  244 human scores. Resample it and see how far the AUROCs move.
- "Under-sensitive" is **too broad**. Per-post |delta| is large (median 15) and merely cancels.
  If the cancellation is structured rather than random, there is a subpopulation where J3 does
  separate the methods, and the claim needs narrowing.
- The judge applies a consistent standard, read from verbatim evidence on high-|delta| and
  near-identical pairs.
- The `over_polished` asymmetry (15% vs 3%) means what the team thinks. If `over_polished` fires
  alongside a **low** suspicion score, "tell rates match but the mix does not" tells a different
  story than assumed.

Also required: a genuine steelman that J3 is a fine instrument and the team is scapegoating the one
criterion where it does not win.

Do not decide the viewer narrative here; that is ticket 06. Findings ->
`research/j3-adversarial-tie-read.md`.

## Answer

**The tie survives; the ordering does not.** Quantitative pass (heaping, bootstrap,
`over_polished`) run 2026-08-29; the qualitative read and formal steelman completed 2026-08-30 in
[j3-qualitative-and-steelman.md](../research/j3-qualitative-and-steelman.md). Ticket now fully worked. Detail: [j3-adversarial-tie-read.md](../research/j3-adversarial-tie-read.md).

- **Heaping lands.** Top-5 score values cover 55.7% / 51.2% / 70.1% of our method / ZLG / human.
  Switching tie convention from ties->0 to ties->1 moves each AUROC by **0.089**; the published gap
  is **0.0109**. The gap is an eighth of an arbitrary convention's width.
- **Bootstrap is decisive.** 2000 resamples, seed 20260829: difference CI **[-0.039, +0.064]**,
  ordering **flips in 33.3%** of resamples. There is no reportable ordering.
- **Shared human pool refuted as the culprit.** Resampling only the negatives gives CI
  [0.0086, 0.0131] and 0/2000 flips. The instability is in the *method samples*, not the negatives.
  The 0.0109 is a property of these particular 244 comments, not of the methods.
- **`over_polished` fires HIGH** (our method n=37 mean 71.1; ZLG n=7 mean 72.1), against no-tell
  means of 8.0 / 7.6. J3's 0-100 scale is a switch, not a thermometer. High-mode totals are 101 vs
  108: **both methods trip the alarm at nearly the same rate through different doors**, which is
  the mechanism behind the tie.

### Qualitative read and steelman (completed 2026-08-30)

- **The tie is genuine agreement, not coincidence.** 7 of 10 near-identical pairs are clean matches
  reached for the same reasons. One (`1m349q4`, 88 vs 91) is coincidence, pairing a bland sentence
  against a raw unclosed-JSON leak, and is barred from use as a flagship example.
- **The judge is consistent about what it looks for and improvises which label it attaches.**
  9 of 15 high-delta pairs hold up in both directions; the 6 questionable ones skew toward the judge
  inflating ZLG's score past what its own rationale supports.
- **Rationale fidelity is imperfect and now disclosed.** 5 of 50 judgments had a reason label
  disagreeing with the rationale; 2 rationales did not describe the comment they were given. This is
  a limit on all five pages, since every page quotes rationales.
- **The steelman lands on one point and it changed the copy.** Pointwise "is this machine-written?"
  is arguably the most realistic threat model of the five, since a moderator sees one comment rather
  than a lineup, so a tie here may matter more than J1's gap rather than less. And calling the same
  judge blunt on J3 while citing it approvingly on J1, J2, J4 and J5 was inconsistent. "Blunt" is
  gone from the shipped copy; the insensitivity is now scoped to the method-vs-method margin.
