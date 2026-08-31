# What the viewer must show per criterion

Type: grilling
Status: resolved
Blocked by: 05, 06, 07

## Question

What is the contract for the Independent LLM Judge panel on `/zlg-comparison` once the five justifications are locked? `/zlg-comparison.md` must carry the same explanation and justification prose; do not spec a weaker export. `/method` is not in scope.

Decide, for each of J1–J5:

- The explanation block (task, chance, higher/lower).
- The justification block (opinion + at least one example).
- Where it lives *on the panel*: always visible, expandable row, or a panel-local tab.
- How a reader sees a quoted example without dumping the raw 2,928-row table.

Also decide:

- J1 copy must not claim a J4-specificity tradeoff. The two methods are separate 10-way slates. Decide whether to say the judge used polish as a cue after the prompt forbade it.
- J5: whether to show the human-arm `overall` mean (3.402, in the JSONL, not in `codex_judge_summary.json`) and whether the four sub-scores appear or only `overall`. Our method’s mechanics mean is above the human control.
- J4: whether to show the human-arm accuracy (75.4%, sits on ZLG) and that every slate is same-subreddit.
- Whether one comment is shown across criteria (Windrush/`1moxmux` is J2-weakest and J4-hit).

Page-level frame: these are model judges, not a human study; the evaluand is the unique-ZLG 244-pair subset. This ticket writes the spec outline another session implements. It does not implement.

## Answer

**The contract is [`spec/judge-explainer-spec.md`](../spec/judge-explainer-spec.md).**

Shape: the judge table keeps the number, direction, chance level and now a **human arm** column,
plus a per-row affordance into one dedicated justification page per criterion at
`/zlg-comparison/judge/[criterion]` (name-based slugs, not J-numbers). Each page runs a fixed
six-section contract: what was measured, how to read it, the likely misreading, what we think
happened, worked examples, and what it does not show.

Three decisions the spec makes that this ticket was asked to settle:

- **Prose gets one home.** `_lib/judge-copy.ts` becomes the single source for every criterion
  sentence, consumed by the panel, the five pages and the markdown export. Today the five
  interpretation strings are hand-typed in two files and have already drifted (`1-5` vs an en-dash
  version). Adding six prose blocks per criterion on top of that duplication would have made the
  export-divergence bug the map warns about close to certain.
- **Examples are pinned by id, resolved live.** The spec fixes which comment carries which argument;
  the text and the judge's evidence string are read from the artifact at render time. A pinned id
  keeps an argument stable under review; live text stops a quote drifting from what it claims to
  quote.
- **The human arm is shown everywhere it exists**, and the two facts it unlocks lead rather than
  hide: our method is more thread-attributable than real human comments, and mechanically cleaner
  than they are. Both are tells for a system meant to blend in.

J1 copy carries no J4-specificity tradeoff, J3 copy carries no ordering language, and no criterion
is left as a bare number with "lower is better."
