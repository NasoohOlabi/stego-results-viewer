# Docket

Label: `wayfinder:map`
Status: **complete**, 2026-08-30 — spec written, panel implemented and shipped.

## Destination

Explain each of the five independent LLM-judge criteria on the Independent LLM Judge panel on
`/zlg-comparison`, and justify the frozen 2026-08-29 full-run numbers with examples and a stated
opinion. `/zlg-comparison.md` carries the same prose. Reached: see [Result](#result).

## Result

A dedicated justification page per criterion at `/zlg-comparison/judge/[criterion]`, linked from
its row in the judge table, plus a **human arm** column showing the real-comment control every
task already scored but never displayed. All copy lives in one module,
`src/app/zlg-comparison/_lib/judge-copy.ts`, consumed by the table, the five pages, and the
markdown export, so the three surfaces cannot drift. Spec: [spec/judge-explainer-spec.md](spec/judge-explainer-spec.md).

## Decisions

Detail and evidence for each line lives in its linked ticket and research note; this is the index.

- [What each criterion measures](issues/01-what-each-criterion-measures.md) — same 244 pairs, five different tasks; denominators differ (per-method rate, shared 3-way slate, AUROC pairing).
- [Why J1 flags our method more](issues/02-why-j1-flags-our-method-more.md) / [which J1 story we tell](issues/05-which-j1-story-we-tell.md) — a hedge-then-thesis sentence architecture is the cause, not vocabulary; own the stealth loss and say the format likely **understates** it (the *decoy-sink* effect); the agreement-opener tell downgrades to a symptom under scrutiny. [Length/slate-composition and reply-shape rivals refuted](issues/10-whether-j1-detection-tracks-length-and-slate-composition.md).
- [Whether J3 is insensitive](issues/03-whether-j3-is-insensitive.md) / [which J3 story we tell](issues/06-which-j3-story-we-tell.md) — the 0.66 tie is real and mostly genuine agreement, but the published ordering (0.661 vs 0.650) is smaller than the measurement's own tie-breaking noise and does not survive bootstrap. Insensitivity is scoped to the method-vs-method margin only; the criterion separates machine from human well above chance.
- [What J2/J4/J5 examples show](issues/04-what-j2-j4-j5-examples-show.md) / [which stories we tell](issues/07-which-j2-j4-j5-stories-we-tell.md) — three separate stories, not one win. Beating the human arm on J4 (89.3% vs 75.4%) and on J5 mechanics (4.795 vs 3.971) reads as a liability, not an achievement, for a system meant to blend in.
- [What the viewer must show](issues/08-what-the-viewer-must-show.md) — the spec (linked above); [panel sketch](issues/09-judge-explainer-panel-sketch.md) superseded once the map took on execution.
- [Adversarial read of the J3 tie](issues/11-adversarial-read-of-the-j3-tie.md) — quantitative and qualitative passes both hold up; changed the shipped copy (dropped "blunt," added a rationale-fidelity limit to all five pages).

## Notes

- Domain: viewer copy and argument for the independent LLM judges. Frozen scores:
  `stego-side-wing/docs/reports/2026-08-29-independent-llm-judge-results.md`. Artifacts:
  `stego-side-wing/metrics/zlg_comparison_runs/zlg_lucid_fresh_6x_20260815_independent_unique_judge`.
- Canonical baseline name is **ZLG**, never CLG.
- **Artifact join trap:** join `attribution_judgments.jsonl` on its own embedded `answer`, not on
  `attribution_answer_key.jsonl` by `task_id` — the latter disagrees on 51/732 rows and does not
  reproduce the published 89.3%/75.0%.
- No new scores invented; no judge prompt changed; no re-run of the 2,928-task campaign.

## Out of scope

- Re-running the judge campaign or swapping the judge model.
- Editing `config/evaluation_prompts/*` in side-wing.
- A human reader study.
- Justifying non-judge comparison metrics (PPL, KLD, BPW, lexical).
- Propagating the justifications into `project_paper` — that repo has its own writing conventions
  and deserves its own effort.
