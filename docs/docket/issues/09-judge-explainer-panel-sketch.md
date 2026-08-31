# Judge-explainer panel sketch

Type: prototype
Status: resolved
Blocked by: 08

## Question

What should the judge-explainer surface look and feel like, cheaply, so the spec is not only prose?

Raise fidelity with a throwaway sketch (markdown mock, ASCII layout, or a stub component that is not merged as the real panel) that follows the contract in What the viewer must show per criterion. React to it with the human before the implementation session. Link the artifact from this ticket. Do not land production UI.

## Answer

**Superseded by the execution override, deliberately.**

This ticket existed to raise fidelity cheaply before anyone wrote production UI. Two things removed
its reason to exist. The map now carries execution (Notes, 2026-08-29), so the implementing session
is this effort rather than a later hand-off. And the spec fixes the page contract, the routing, the
copy module and the example beats in enough detail that a throwaway ASCII mock would restate it at
lower resolution.

The artifact to react to is the real surface: `_lib/judge-copy.ts` plus the first justification page,
reviewed before the remaining four are generated from the same record. If that review shows the
contract is wrong, the correction is cheap, because all five pages render from one dynamic route and
one copy module.

Recorded rather than quietly skipped: no prototype sketch was produced for this map.
