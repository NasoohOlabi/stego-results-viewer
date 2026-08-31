# Adversarial read: is the J3 tie real, and is J3 under-sensitive?

Reduced-scope adversarial pass for docket ticket 11, run inline after the original subagent was
lost to a session limit. Covers the two attacks that could actually falsify the team's intended
claim (heaping / tie-breaking sensitivity, and bootstrap stability) plus the `over_polished`
question. The 15-post qualitative evidence read and the full steelman were **not** run; see Limits.

Artifacts: `zlg_lucid_fresh_6x_20260815_independent_unique_judge/comparison_dataset/codex_judgments/suspicion_judgments.jsonl`,
n = 244 per arm (our method, ZLG, human). AUROC computed by rank counting with explicit tie
handling, not the 244x244 double loop, so the three tie conventions are separable.

## Bottom line

The team may publish "this is a real tie," and must **stop publishing it as 0.661 vs 0.650**. Those
two numbers do not support an ordering. The 0.0109 gap is roughly an eighth of the 0.089 swing you
get from merely changing how tied scores are counted, and under a full bootstrap the ordering
reverses in **33.3%** of resamples with a difference CI of [-0.039, +0.064] straddling zero. The
"under-sensitive as a method-level separator" half survives and is in fact strengthened. The
shared-human-pool worry is **refuted**: the instability lives in the method samples, not in the
negatives. The `over_polished` asymmetry means what the team thought, and the mechanism is now
concrete: both methods enter J3's high mode at nearly the same rate, through different doors.

## Gate

| | ties->0 | ties->0.5 (published) | ties->1 |
| --- | ---: | ---: | ---: |
| Our method | 0.6162 | **0.6607** | 0.7052 |
| ZLG | 0.6051 | **0.6497** | 0.6944 |

Published values reproduce exactly at the ties->0.5 convention. **Gate: PASS.**

## Attack 1 — score heaping. Lands.

The judge reuses a handful of integers. Top-5 concentration: our method 55.7% of all scores (41
distinct values), ZLG 51.2% (42), human 70.1% (35). The five values are the same ones in every arm
(8, 3, 5, 12, 18).

That heaping is not cosmetic. Moving from ties->0 to ties->1 swings each AUROC by **0.089**, while
the entire published gap between the methods is **0.0109**. The gap is 12% of the width of an
arbitrary scoring convention. Any sentence that treats 0.661 as meaningfully above 0.650 is
reporting a tie-handling artifact as a result.

## Attack 2 — bootstrap. Lands, and is the decisive test.

2000 resamples, seed 20260829, resampling all three arms.

| Quantity | 95% CI |
| --- | --- |
| Our method AUROC | [0.6101, 0.7072] |
| ZLG AUROC | [0.5997, 0.6956] |
| Difference (our - ZLG) | **[-0.0391, +0.0636]**, mean +0.0113 |

The difference CI straddles zero and the **ordering flips in 666/2000 = 33.3% of resamples**. One
resample in three puts ZLG above our method. There is no reliable ordering here to report.

## Attack 3 — is the shared human pool doing the work? Refuted.

Holding both method score sets fixed and resampling only the 244 shared human negatives: difference
CI [0.0086, 0.0131], **0/2000 flips**. Conditional on these exact comments, our method ranks
fractionally above ZLG against essentially any human pool.

Read Attack 2 and Attack 3 together, because the contrast is the finding. The shared negatives are
stable; the *method samples* are not. The 0.0109 gap is a property of the particular 244 comments
drawn, not a property of the methods. This kills the "shared human control hid a real gap"
hypothesis in the opposite direction from the one anyone expected.

## Attack 5 — `over_polished` fires with HIGH scores, not low.

| Arm | `over_polished` | other real tell | no tell |
| --- | --- | --- | --- |
| Our method | n=37, mean **71.1** | n=64, mean 52.3 | n=143, mean **8.0** |
| ZLG | n=7, mean **72.1** | n=101, mean 58.3 | n=136, mean **7.6** |

Two things follow. First, the two-mode reading of J3 is confirmed hard: no tell means ~8, any tell
means 52-72. The 0-100 scale is a switch, not a thermometer. Second, the team's "tell rates match,
tell mix does not" line is safe and can be sharpened: our method reaches the high mode through
`over_polished` 37 times and other tells 64 times; ZLG reaches it through `over_polished` 7 times
and other tells 101 times. Totals 101 vs 108. **Both methods trip J3's alarm at nearly the same
rate, by different doors, which is exactly why the AUROCs tie.** That is a mechanism, not a
coincidence, and it is the sentence the justification page should carry.

## What the spec may claim, what it must soften

- **May claim:** the tie is real. Strengthened, not weakened, by every attack above.
- **May claim:** J3 is under-sensitive as a method-level separator vs human. Strengthened.
- **May claim:** both arms reach the high-suspicion mode at nearly equal rates through different
  tells. Now quantified.
- **Must soften:** any ordering language. Replace "0.661 vs 0.650, our method marginally higher"
  with a statement that the two are indistinguishable, and either drop the third decimal or
  present the pair with its bootstrap CI. Suggested wording: *"0.66 for both arms; the difference
  is smaller than the noise in the measurement (95% CI on the difference -0.04 to +0.06, and the
  ordering reverses in a third of bootstrap resamples)."*
- **Must not claim:** that the shared human control suppressed a real gap. It did not.

## Limits

- The 15-post qualitative evidence read and the formal steelman from the original ticket were not
  run. A future session can still do them; nothing here depends on them.
- Bootstrap resamples comments independently within arm and ignores the post pairing. The paired
  sign test on raw scores (p=0.385) already speaks to the paired view and agrees: no difference.
- One judge, one model. Everything here is about that judge's score distribution.
