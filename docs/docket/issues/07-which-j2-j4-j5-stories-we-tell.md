# Which J2, J4, and J5 stories we tell

Type: grilling
Status: resolved
Blocked by: 01, 04

## Question

Constraint from [What J2, J4, and J5 examples actually show](../research/what-j2-j4-j5-examples-show.md) — do not re-litigate these:

- These three wins are not one story. J2 and J5 punish polish and reward terse colloquial fragments; J4 rewards any recoverable thread hook.
- J2: human weakest 57/244 (23.4%), our method 71 (29.1%), ZLG 116 (47.5%). Our method is near the human control, not far below chance. ZLG loses as generic/awkward fragments; our method loses as polished abstraction.
- J4: every slate is same-subreddit. Human control 75.4% sits on ZLG (75.0%); our method is 89.3% and above the human arm. 52 same-post ZLG misses vs our-method hits. Descriptive only (no paired test).
- J5: human mean 3.402 in the JSONL. Our method 3.193, ZLG 2.791. Sign-test 106/67/71, p=0.00374 — the only inferential paired test of the three. A slice of ZLG 1s are non-comments (boilerplate).
- J4 is thread-blurb match, not the other face of J1. Extra J1 detections are not the J4-correct comments ([Why J1 flags our method more than ZLG](../research/why-j1-flags-our-method-more.md)).

Quoteable candidates already in that note: `1mp2r91`, `1mqixam`, `1moxmux`, `1lqu69t`, `1mpltgc`, `1mr0g5z`, `1mw6fp0`, `1mjq91r`. Pick which the spec may quote.

For each criterion: what the number means in one sentence, why this method’s number is the one we expected or the one we still need to own, and one opinion a reader can disagree with (not just “higher is better”). J2 in particular should stay honest that “not the weakest of three” is a different claim from “undetectable.”

## Answer

**Locked 2026-08-30** on the disclosure set (one comment tracked across criteria; human-arm anchors
and the same-subreddit fact not selected). Per-criterion opinions drafted below for review at spec
time.

- **J2 weak-link.** One sentence: how often each arm is named the least human-plausible of three,
  where the human control is in every slate. Opinion a reader can disagree with: *this is the
  criterion where our method looks best and means least.* ZLG's 47.5% is inflated by outputs that
  are not comments at all (page chrome, survey widgets, fragments), which no reader would mistake
  for a human reply. "Not the weakest of three" is a much weaker claim than "undetectable," and the
  page must say so in those words.
- **J4 thread attribution.** One sentence: which of four thread blurbs the comment belongs to.
  Opinion: correct attribution here is thread-specific topical match, not subreddit identity and
  not leaked angle labels; ZLG's misses are under-specified fragments the judge binds to a stray
  lexical hook. Descriptive only, no paired test. **See the conflict below.**
- **J5 register.** One sentence: 1-5 style fit against genuine comments from the same subreddit.
  Opinion: the only inferential paired result of the three (106/67/71, p=0.00374), so it is the one
  number here that survives a significance test rather than merely being larger.
- **Cross-criterion thread.** Track the Windrush comment (`1moxmux`) across all three: J2 names it
  weakest for being polished and agenda-framed, J4 scores it a 98-confidence hit off that same
  content, J5 puts it a point below ZLG. One text, three verdicts. This is what makes "these are
  three different stories" concrete instead of asserted.

### Conflict this ticket surfaced — RESOLVED 2026-08-30

The conflict was that excluding the human arm left J4 and J5 with no defensible opinion. **Resolved
by reinstating it.** The panel shows the human arm wherever it exists, and every number is earned
with worked examples instead of asserted.

That restores the two strongest claims on the panel, both of which cut against us:

- **J4:** our method is traced back to its source thread *more* reliably than real human comments
  from that same thread (89.3% vs 75.4%). The honest reading is not "we win" but "our comments are
  more self-contained than real conversation" — a tell for a system meant to blend in.
- **J5:** our mechanics sub-score (4.795) is *above* the human arm (3.971) while our overall
  (3.193) sits *below* it (3.402). Cleaner than people write, and rated less human for it.

Revised opinions, superseding the drafts above for these two criteria:

- **J4 opinion:** attribution accuracy above the human control is a liability, not an achievement.
  It means the payload-bearing comment carries more recoverable thread signal than genuine comments
  do.
- **J5 opinion:** mechanics is not what register rewards. Our method wins the sub-score that
  measures correctness and loses the one that measures belonging, which is the whole problem in
  miniature.

Both need worked examples on their justification pages rather than assertion; that is what
`research/j4-j5-human-arm-patterns.md` supplies.
