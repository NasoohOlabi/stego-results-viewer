# What each criterion actually measures

Type: research
Status: resolved

## Question

For J1 standout, J2 weak-link, J3 suspicion, J4 thread attribution, and J5 register, what does the judge actually see, what does it return, and how does that become the number in the `/zlg-comparison` full-run table?

Produce one short block per criterion covering:

- The prompt’s task in one sentence (from `stego-side-wing/config/evaluation_prompts/`).
- The slate construction (from `stego-side-wing/src/services/judge_slate_service.py`).
- The scoring key and formula used by the viewer (`stego-results-viewer/src/app/zlg-comparison/_lib/llm-judge.ts`) and any extra rollup in `judge_scoring_service.py` / the 2026-08-29 report.
- Chance or human-anchor, and whether lower or higher is better.
- The denominator (244 post clusters vs per-method task count vs AUROC pairing).

Primary sources only. Do not justify wins or losses here. Write findings to `docs/docket/research/what-each-criterion-measures.md` and put the answer on this ticket.

## Answer

Each criterion is a different task on the same 244-pair set. J1/J4/J5 table cells are per-method rates or means over 244 tasks; J2 is pick-rate over 244 shared 3-way slates; J3 is unpaired AUROC of 244 method scores vs 244 human scores (not a mean suspicion). Lower is better for J1–J3; higher for J4–J5. Chance: 10% / 33% / 0.5 AUROC / 25% / no identification chance (1–5 with a human arm that is not shown).

Findings: [docs/docket/research/what-each-criterion-measures.md](../research/what-each-criterion-measures.md)
