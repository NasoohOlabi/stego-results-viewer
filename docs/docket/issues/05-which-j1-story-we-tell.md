# Which J1 story we tell

Type: grilling
Status: resolved
Blocked by: 01, 02, 10

## Question

Given the mechanics and the J1 examples, which justification do we lock for the viewer?

Constraint from [Why J1 flags our method more than ZLG](../research/why-j1-flags-our-method-more.md) — do not re-litigate these:

- The charting hypothesis is retired: extra J1 detections are **not** the J4-correct, thread-specific comments. Our-method J1 hit rate is 50% among J4-correct comments and 65% among J4-wrong (small n). Hit evidence says generic / polished / lacking specificity (102 / 70 / 62 of 126 hits). “Too on-topic / restates the article” is a minority (11+2+1).
- The prompt forbids using polish as a cue. The judge still writes *polished* on 70 / 126 our-method hits.
- Same-post cells: 84 our-only, 42 both, 91 neither (57 of those share the same human false positive), 27 ZLG-only. Confidence is high on hits *and* misses.
- ZLG’s 28.3% is not pure stealth: some hits are malformed covers (JSON, survey widgets); many misses are short generic asides the judge gives to a flashier human.
- The two methods are separate 10-way tasks, not one shared slate.

Live choice: (a) own it as a register/polish cost among messy humans (a real stealth loss, not a J4 tradeoff), (b) call the instrument compromised because it uses the forbidden polish cue, (c) split ZLG’s number (malformed easy hits vs blending fragments), or a combination. Pick one or two quoteable comments from that note (`1m9vtya`, `1me1y3z`, `1m59xin`, `1mhqzuk`, `1mnnv15`, `1lw4su3`). The viewer must not leave J1 as a bare 51.6% vs 28.3% with “lower is better,” and must not explain it as “we are more specific so we stand out.”

## Answer

**Locked 2026-08-29.** The J1 justification page argues the ticket-02 account and adds the one
concrete artifact that survived testing.

1. **Cause.** Generic polish plus missing thread grit, as ticket 02 established. Own the stealth
   loss plainly: in a ten-way lineup of real comments from the same thread, our method is picked
   out more than ZLG, and that is a real cost, not a measurement artifact.
2. **Disclose the instrument.** The J1 prompt forbids using polish as a cue; the judge wrote
   *polished* on 70 of 126 hits anyway. Say so. It weakens a verdict that goes against us, which is
   precisely why it has to be said rather than buried.
3. **Split ZLG's 28.3%.** Twelve of its 69 hits are malformed covers (JSON, survey widgets); many
   of its misses are short generic asides the judge hands to a flashier human. ZLG's number is not
   pure stealth.
4. **Name the surviving artifact, sized honestly.** Our method opens with an agreement token
   ("Exactly,", "Honestly,", "Agreed,") on **24.6%** of comments against a human rate of **7.2%**
   and ZLG's 3.3%, and is detected **63.3%** with that opener versus 47.8% without. Present it as a
   concrete, fixable generation-side tell covering 60 of 244 comments. It must **not** be sold as
   the explanation for the whole gap.
5. **Show the rejected rivals.** State that length/slate composition and stranded reply-shape were
   both tested and refuted (ticket 10). Publishing the tested-and-failed alternatives is what makes
   claim 1 credible rather than merely asserted.

Forbidden framings, unchanged: no J4-specificity tradeoff, no "we are more specific so we stand
out," and no bare 51.6% vs 28.3% with only "lower is better."

### Amended 2026-08-30 after the adversarial read (ticket 10)

Point 4 was over-claimed as first written and the shipped copy is corrected.

- **The agreement opener is a symptom, not an independent tell.** Conditioning on whether the judge
  already called the comment generic or polished collapses the effect to 73.7% vs 70.8%. Across the
  126 detections, rationales cite generic/polished at the same rate with the opener (94.7%) and
  without it (94.3%), and only 6 of 38 opener-bearing detections mention the marker. Still worth
  fixing; no longer sold as a separate cause.
- **New and it cuts against us: the decoy-sink effect.** On 57 of 118 misses the judge's rationale
  for its *wrong* pick still complains about generic or polished writing, pinned on a real human. A
  conspicuous human absorbs the accusation our comment earned, so 51.6% likely understates
  detectability. The page says so.
- **The cause is sharper than "generic polish."** An affective hedge followed by a thesis-like
  closing clause, present in every detected comment in a 20-slate sample. A sentence architecture,
  not a vocabulary, which is why paraphrase does not remove it.
- **Also refuted:** absence of proper nouns. Named entities appear in nearly half the caught
  comments sampled.
