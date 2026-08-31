# Judge explainer spec

Spec for docket ticket 08. Status: **complete and implemented** (2026-08-30). All example slots
filled; see the map's Shipped section for what landed.

The Independent LLM Judge panel on `/zlg-comparison` currently shows five numbers with a one-line
interpretation each. This spec adds, for every criterion, an explanation of what was measured and a
justification of why the number came out that way, with worked examples and a stated opinion.

## 1. Surface architecture

Two levels, decided 2026-08-29.

**Level 1 — the judge table** (`llm-judge-panel.tsx`, `FullResults`). Keeps the number, the
direction, and the chance or human-arm level. Gains a third data column for the **human arm** and a
per-row affordance that navigates to that criterion's justification page. Nothing longer goes here;
the table stays scannable.

**Level 2 — one justification page per criterion.** Carries the argument, the examples, and the
opinion.

### Routing

One dynamic route, not five files:

```
src/app/zlg-comparison/judge/[criterion]/page.tsx
```

`criterion` is a literal union: `standout | weak-link | suspicion | attribution | register`. Slugs
are the criterion's own name, not `j1`..`j5`, because the J-numbers are a table ordering rather than
an identity and a URL should survive a reordering. Validate the param against the union and call
`notFound()` on anything else.

**No `generateStaticParams`.** Prerendering would bake the pinned example quotes in at build time,
so a page could keep quoting a run it no longer describes if `ZLG_RUN_DIR` is repointed. The route
is `force-dynamic`, matching the parent page; reads are cheap because `artifact-cache` keys on file
mtime.

Each page renders from the shared copy module in section 2; there is no per-criterion bespoke JSX.

### Reader entry points

- Whole row is a link. The affordance is a visible chevron or "Why?" control in a trailing cell, not
  a bare clickable row, so the target is discoverable and keyboard-reachable.
- Each justification page carries a back link to `/zlg-comparison` and prev/next links across the
  five criteria, so a reader can walk all five without returning to the table.

## 2. Single source of truth for prose

The current duplication is a live bug: the five interpretation strings are hand-typed in both
`llm-judge-panel.tsx` (lines ~285–350) and `zlg-comparison.md/route.ts` (lines ~334–358), and have
already drifted cosmetically (`1–5` vs `1-5`). Every new sentence this spec adds would double that
exposure.

Introduce **`src/app/zlg-comparison/_lib/judge-copy.ts`**, exporting one record keyed by criterion:

```ts
export type CriterionSlug =
  | "standout" | "weak-link" | "suspicion" | "attribution" | "register";

export type JudgeCriterionCopy = {
  slug: CriterionSlug;
  label: string;              // "J1 standout"
  shortInterpretation: string; // the existing table cell, now defined once
  direction: "lower-better" | "higher-better";
  chance: string;             // "10%", "33%", "0.5 AUROC", "25%", null for J5
  explanation: { panel: string; long: string };
  misread: string;            // the single most likely reader misconception, corrected
  justification: { opinion: string; body: string[] };
  examples: PinnedExample[];  // section 3
};
```

Consumed by all three surfaces: the table (`shortInterpretation`), the justification pages
(everything), and `zlg-comparison.md/route.ts` (everything, rendered flat). Neither the panel nor
the route may contain a literal criterion sentence after this lands. Prose lives in one file the
same way numbers already live in `_lib/data.ts`.

Explanation copy is drafted in `research/explanation-blocks-draft.md`, in both a panel-length and a
long-form register, which maps onto `explanation.panel` and `explanation.long`.

## 3. Examples: pinned ids, live text

This settles the map's open question ("pinned pair ids in the spec, or sampled at render time").

**Both, deliberately.** The spec pins *which* examples appear, by `post_id` and method; the comment
text and the judge's `evidence` string are read from the artifacts **at render time**.

```ts
type PinnedExample = {
  postId: string;                       // e.g. "1moxmux"
  arms: ("our_method" | "zlg" | "human")[];
  caption: string;                      // why this example is here, written by us
};
```

Rationale. Pinning the id keeps the argument stable and reviewable — a justification that cites a
randomly sampled comment can silently become a justification for a different claim. Reading the text
live means a quote can never drift from the artifact it claims to quote, which is the failure mode
that matters for a research page. If a pinned id cannot be resolved, render the caption and a
"quote unavailable" note rather than falling back to a different comment.

**Plumbing required.** `paired_rows.jsonl` `stegotext` is already loaded server-side into
`pairedRows` in `_lib/data.ts` but never passed to the panel — `page.tsx` passes only
`samples.length`. Build a `Map<string, {our_method, zlg}>` keyed by `String(pair_id)` and thread it
through. The join is verified: `String(pairedRow.pair_id) === judgment.pair_id` resolves all 244
judged pairs with zero misses. The judge's `evidence` string already survives `projectJudgment` and
reaches the panel today; it is simply never rendered as prose.

Do **not** un-drop `prompt_fields`. It is stripped for payload size and dominates a 43 MB file.

## 4. Per-criterion page contract

Every justification page renders these sections in this order:

1. **What was measured.** `explanation.long`. Task, slate construction, the exact formula and its
   denominator.
2. **How to read the number.** Direction, chance level, and the human arm. Define "human arm" on
   first use on every page — a reader landing from a link has not read the others.
3. **The misconception.** `misread`. One flat sentence naming the most likely misreading and
   correcting it.
4. **What we think happened.** `justification.opinion` as a standalone claim a reader could
   disagree with, then `justification.body`.
5. **Worked examples.** Pinned quotes with the judge's verbatim evidence and our caption.
6. **What this does not show.** The limits, stated by us rather than left for a reader to find.

## 5. Locked content per criterion

Sourced from resolved tickets 05, 06, 07, 10, 11.

| Criterion | Opinion the page argues |
|---|---|
| J1 standout | A **hedge-then-thesis sentence architecture** is the cause, not "too on-topic" and not a vocabulary. Own the stealth loss and say the format likely **understates** it: on 57 of 118 misses the judge's wrong pick still cites generic/polished writing, pinned on a human (the decoy-sink effect). Disclose that the judge cited polish after its prompt forbade it. Split ZLG's 28.3% — 6 of 8 hits read closely are mechanical failures, so ZLG is less ambitious, not stealthier. The agreement opener is **downgraded to a symptom**, not an independent tell. Publish all refuted rivals. |
| J2 weak-link | The criterion where our method looks best and means least — ZLG's 47.5% is inflated by outputs that are not comments at all. "Not the weakest of three" is not "undetectable." |
| J3 suspicion | A real tie, with insensitivity scoped to the **method-vs-method margin only**. At 0.66 the criterion tells machine from human well above the 0.5 chance line; what it cannot resolve is the gap between two machines. Do not call it "blunt" unqualified. Both arms trip the alarm at near-equal rates (101 vs 108) through different tells. **Report ~0.66 for both; never 0.661 vs 0.650 as an ordering.** |
| J4 attribution | Beating the human arm (89.3% vs 75.4%) is a liability. Humans fail this task because real comments are terse reactions, meme lines and reply-to-reply fragments carrying no thread signal — **98.3% of wrong human attributions share zero content words with the true title**, against 61.4% of correct ones. Our comments restate the topic, so they are easier to trace home. That is a measure of being *less* like conversation, not more. |
| J5 register | We win the sub-score that does not matter and lose the ones that do. **`tone_formality` drives `overall` (r=0.885); `mechanics` barely does (r=0.334).** Our +0.824 mechanics edge sits on the weakest lever while our deficits — tone_formality −0.151, insider_knowledge −0.246 — sit on the strongest. The judge's evidence says "too formal", "polished", "measured", never grammar. |

**Cross-criterion thread.** The Windrush comment (`1moxmux`) appears on the J2, J4 and J5 pages:
named weakest for being polished and agenda-framed, a 98-confidence attribution hit off that same
content, and a point below ZLG on register. One text, three verdicts. Each page links the other two.

### Hard prohibitions

- No J4-specificity tradeoff on the J1 page. The two methods sit in separate ten-way slates.
- No "we are more specific so we stand out."
- No bare number plus "lower is better" on any criterion.
- No ordering language on J3.
- Never "CLG"; never "LUCID" as the method's name.

## 6. Markdown export

`zlg-comparison.md/route.ts` renders the same `judge-copy.ts` record: the table with the human-arm
column, then one `##` section per criterion carrying every part of the page contract in order.
Collapsed-versus-expanded has no meaning in markdown, so everything renders unconditionally. The
export must not be a summary of the pages; it is the same prose, flat. Pinned example quotes resolve
through the same lookup.

## 7. Out of scope for the implementing session

- Re-running the judge campaign or changing any judge prompt.
- Touching `/method`.
- New Radix dependencies. Only `@radix-ui/react-accordion` is installed; the repo's established
  toggle pattern is `useState` plus styled buttons.
- Propagating any of this into `project_paper`.

## 8. Example sourcing — closed

All research is in. Pinned ids are drawn from `research/quotable-examples.md` (verbatim dossiers for
14 posts across all five criteria) and `research/j4-j5-human-arm-patterns.md`.

Required example beats per page:

- **J1** — one our-method hit with the judge's polish evidence, one ZLG malformed-cover hit
  (showing its 28.3% is not pure stealth), and one both-miss shared false positive (showing the
  judge spending confidence on a human). Plus an agreement-opener specimen.
- **J2** — one where ZLG is named weakest as a non-comment, one where our method is named weakest
  as polished abstraction, and one where the *human control* is named weakest (57/244), which is
  what stops the criterion reading as a clean win.
- **J3** — one high-suspicion pair and one near-identical pair, to show the two-mode switch. No
  ordering language anywhere on this page.
- **J4** — at least three wrong human attributions quoted verbatim. These carry the whole argument:
  a reader who sees "Or marijuana and drug laws", "Trump has entered the chat" and "Yeah, I have no
  sympathy" understands instantly why humans score 75.4% and why our 89.3% is not a triumph.
- **J5** — human comments with real typos scored low on mechanics (`academkca`, `marraige`,
  `same along`) beside our method's mechanics-5 comments, then examples where high mechanics still
  earned low overall with the judge citing formality.

**Preserve typos exactly.** In the J5 examples the misspellings *are* the evidence. Any pipeline
that spell-corrects a quote destroys the argument.

**Second instrument, worth citing.** `paired_rows.jsonl` carries `codex_suspicion_tells`, which
flags our method `over_polished` on 15.2% of rows against ZLG's 2.9% — an independent signal that
excess cleanliness is registered as a tell, not a virtue. Cite it on the J5 page so the liability
claim rests on two instruments rather than our interpretation of one.

**Windrush check.** On `1moxmux` all three arms attribute correctly at J4; at J5 our method and the
human arm tie at overall 3 despite mechanics 5 versus 2, while ZLG scores 4. Useful precisely
because it refutes "most polished wins."
