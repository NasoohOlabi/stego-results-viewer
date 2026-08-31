# Whether J3 is insensitive

Type: research
Status: resolved

## Answer

The 0.661 vs 0.650 AUROCs are a real similarity of rank vs the shared human pool (medians both 12; ~41–44% any-tell; method-vs-method AUROC 0.50), not AUROC-only compression. J3 is blunt as a method-level separator: both arms are bimodal (low clump at 3–12 plus a high tail), while J1 on the same posts is 51.6% vs 28.3% — including 34.9% vs 12.3% inside the J3 [0,10) bin. Findings: [whether-j3-is-insensitive.md](../research/whether-j3-is-insensitive.md).

## Question

J3 suspicion AUROC is 0.661 (our method) vs 0.650 (ZLG) against held-out human, with report p=0.385. The two methods look tied. Is that a real similarity, or is the criterion too blunt to separate them?

From suspicion JSONL, scoring code, and the prompt/schema:

- Distribution of raw 0–100 scores for our method, ZLG, and human (percentiles, overlap, not just AUROC).
- Which `tells` fire, and whether they fire at similar rates for both methods.
- Correlation (even crude) with J1 detection and J5 overall on the same posts.
- Whether AUROC-vs-human can stay nearly equal while J1 (forced identification among humans) still differs a lot — i.e. both look “a bit machine-y” pointwise, but only one pops in a 10-way lineup.
- Any scoring or pairing detail that would shrink a real gap (same human control, post-clustering, unique-ZLG subset).

Do not decide whether we call the benchmark broken. Write findings to `docs/docket/research/whether-j3-is-insensitive.md` and put the answer on this ticket.
