# What J2, J4, and J5 examples actually show

Type: research
Status: resolved

## Question

J2, J4, and J5 currently read as wins or near-wins for our method (J2 29.1% vs 47.5% weakest; J4 89.3% vs 75.0% attribution; J5 3.193 vs 2.791 register). What do the examples and human anchors actually show, so a justification is not just “the number is better”?

For each of J2, J4, and J5:

- Restate the task in one sentence, then show at least four quoted examples (win, loss, and a close call) with the judge’s evidence.
- J2: how often the human control is named weakest (report says 23.4%) and what “weakest” looks like when ZLG loses vs when we lose.
- J4: whether correct attribution is driven by named entities, angle leftovers, or generic subreddit cues; compare a ZLG miss to an our-method hit on the same post if present.
- J5: what the 0.402 post-cluster gap looks like in comments; include the human-anchor mean if the scoring artifacts have it. Note the sign-test (106 / 67 / 71, p=0.00374) so the justification can say whether this one is inferential or descriptive.

Write findings to `docs/docket/research/what-j2-j4-j5-examples-show.md` and put the answer on this ticket.

## Answer

J2/J4/J5 are not one story. J2 human control is weakest 57/244 (23.4%); ZLG loses as generic/awkward fragments, our method as polished abstraction (Windrush leftover). J4 slates are 244/244 same-subreddit, so subreddit cues cannot distinguish; 52 same-post ZLG misses vs our-method hits are under-specified fragments bound to the wrong news title. J5 human mean is 3.402; the 0.402 gap (106/67/71, p=0.00374) is the only inferential paired test of the three.

Findings: [what-j2-j4-j5-examples-show.md](../research/what-j2-j4-j5-examples-show.md)
