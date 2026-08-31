# Panel code inventory

Inventory of the current `/zlg-comparison` Independent LLM Judge panel code, for docket ticket 08
("What the viewer must show per criterion") so the spec targets the real component tree and data
path instead of guesses. This is AFK groundwork only — no source files were changed.

## Current panel structure

Component tree, `src/app/zlg-comparison/_components/llm-judge-panel.tsx`:

- `LlmJudgePanel` (component, `llm-judge-panel.tsx:53-147`) — top-level section. Owns `tab` state
  (`"summary" | "judgments"`, `llm-judge-panel.tsx:61`), a hand-rolled tab switcher rendered as two
  `<button>`s (`llm-judge-panel.tsx:88-99` — **not** a Radix `Tabs` primitive, just `useState` +
  conditional class), a completion header (`llm-judge-panel.tsx:80-100`), a 4-up `JudgeStat` grid
  (`llm-judge-panel.tsx:101-109`), an optional subset-selection note (`llm-judge-panel.tsx:110-117`),
  and a per-metric progress grid (`llm-judge-panel.tsx:118-136`).
  - When `tab === "summary"`: renders `FullResults` then `Summary` (`llm-judge-panel.tsx:139-140`).
  - When `tab === "judgments"`: renders `Judgments` (raw paginated table, `llm-judge-panel.tsx:143`).
- `JudgeStat` (`llm-judge-panel.tsx:149-158`) — label/value stat tile, no interpretation copy.
- `FullResults` (`llm-judge-panel.tsx:182-357`) — this is **the** table the docket is about:
  - "Results at a glance" card row (`llm-judge-panel.tsx:232-258`): four `ResultCard`s
    (`llm-judge-panel.tsx:359-400`), one per J1/J2/J3/J5 (no card for J4 in this row), each with a
    one-line `note` prop that is the closest thing today to an "explanation" (e.g. `"Lower is
    better; 10% is chance."` at `llm-judge-panel.tsx:235`).
  - The "Full-run result" table (`llm-judge-panel.tsx:259-354`), columns "Full-run result / Our
    method / ZLG / Interpretation". One `<tr>` per criterion, J1 at `llm-judge-panel.tsx:270-287`,
    J2 at `288-305`, J3 at `306-315`, J4 at `316-333`, J5 at `334-351`. **The "Interpretation"
    column copy is a hard-coded JSX string literal inside each row**, e.g. `"Lower is better;
    chance is 10%."` (`llm-judge-panel.tsx:285-286`), `"Lower is better; chance is 33%."`
    (`llm-judge-panel.tsx:303-304`), `"AUROC against held-out human; lower is better."`
    (`llm-judge-panel.tsx:312-314`), `"Higher is better; chance is 25%."` (`llm-judge-panel.tsx:
    330-332`), `"1–5 score; human-anchor comparison follows below."` (`llm-judge-panel.tsx:348-350`).
    There is no shared constant or lookup table for this copy — five independent literals, one per
    row, inline in JSX.
- `Summary` (`llm-judge-panel.tsx:402-450`) — a second, smaller table ("Metric / Valid-tasks /
  Key result") driven by the `METRICS` array (`llm-judge-panel.tsx:27-33`) and the raw `summary`
  JSON blob. Not where explanation/justification copy would go; it renders machine-derived deltas,
  not prose.
- `Judgments` (`llm-judge-panel.tsx:452-506`) — paginated (`PAGE_SIZE = 100`, `llm-judge-panel.tsx:
  25`) raw table, one row per judgment, columns Metric/Method/Pair/Result. The "Result" cell is
  `row.error ?? JSON.stringify(row.result)` (`llm-judge-panel.tsx:478`) — i.e. today a judge's
  per-row `evidence` string (see Data path below) is already visible on the page, just dumped as
  raw stringified JSON inside this 100-row-page table, not surfaced as prose anywhere.

Helpers used by the above, `src/app/zlg-comparison/_lib/llm-judge.ts`: `rate` (line 32-50, exact-
match accuracy for standout/attribution), `pickedRate` (line 52-64, weak-link pick-rate),
`meanScore` (line 66-78, register mean), `value` (line 27-30, number formatter), all pure and
already shared between the panel and the `.md` export (see Markdown export duplication below).
`nestedNumber` (`llm-judge-panel.tsx:164-176`) is **not** in `llm-judge.ts` — it is a local helper
duplicated only inside the panel file, used to pull `summary.suspicion.auroc.*` and
`summary.*.post_cluster.two_sided_sign_test_p`.

## Data path

- The page is a React Server Component: `src/app/zlg-comparison/page.tsx:18` (`export default
  async function ZlgComparisonPage()`), `export const dynamic = "force-dynamic"`
  (`page.tsx:16`) — no static caching, every request re-derives.
- All loading goes through one function, `loadZlgComparisonData()`
  (`src/app/zlg-comparison/_lib/data.ts:415-959`), called once from `page.tsx:56`. This is plain
  Node `fs`-backed reading via `src/server/artifact-cache.ts`, **not** tRPC — `readJsonCached`
  (`artifact-cache.ts:73-93`) and `readJsonlCached` (`artifact-cache.ts:102-129`) read files
  directly off disk (`node:fs/promises`), keyed by `(size, mtimeMs)` file stamp
  (`artifact-cache.ts:33-40`) so re-reads are skipped until the underlying artifact changes. There
  is no tRPC router in this data path (tRPC exists elsewhere in the repo, e.g.
  `src/server/api/routers/overnight-findings.ts`, but not for this page).
- Judgment rows: `data.ts:525-535` reads `${metric}_judgments.jsonl` for all five
  `JUDGE_METRICS` (`data.ts:226-232`) via `readJsonlCached(..., "judgment", projectJudgment)`.
  `projectJudgment` (`data.ts:273-291`) keeps `metric, method, post_id, pair_id, result, answer,
  error` **in full** (the `result`/`answer` objects are passed through whole via the `record()`
  helper, `data.ts:274-279`) but explicitly drops `prompt_fields`, `raw_response`, `usage` — the
  comment at `data.ts:266-269` states these three fields dominate the 43 MB file and are "never
  rendered."
- `page.tsx:175-182` passes `codexJudgments` (as `judgments`) and `codexJudgeSummary` (as
  `summary`) into `<LlmJudgePanel>`. Nothing else from `loadZlgComparisonData()`'s return
  (`data.ts:921-958`) reaches the panel component except `pairCount={samples.length}`
  (`page.tsx:178`) — a bare count, not the sample objects themselves.
- **Verdict on the "most important question" — can a quoted example comment be pulled live from
  JSONL at render time, or must it be pinned/hard-coded?** Both are possible, but *not* with zero
  changes to the current wiring:
  1. **Already reaching the panel, unused as prose:** every judgment row's `result` object already
     includes a judge-written `evidence` string, confirmed by reading the live artifact at
     `stego-side-wing/metrics/zlg_comparison_runs/zlg_lucid_fresh_6x_20260815_independent_unique_judge/comparison_dataset/codex_judgments/*.jsonl`
     — e.g. a standout row's `result.evidence` = `"Comment 1 is unusually generic, abstract, and
     detached from the thread's concrete facility details and strongly colloquial register."` This
     field survives `projectJudgment` untouched (it's inside `result`) and is already present in
     the `judgments` prop `LlmJudgePanel` receives today — it is just never rendered as prose, only
     dumped inside `JSON.stringify(row.result)` in the raw-judgments table
     (`llm-judge-panel.tsx:478`).
  2. **Not reaching the panel today, but reachable server-side:** the actual candidate/comment
     *text* under judgment is not in the judgments prop. It lives in two places, both currently
     stripped or unwired:
     - `prompt_fields` on the judgment row itself (dropped by `projectJudgment`,
       `data.ts:273-291`, for payload-size reasons) — for `weak_link` this is the cleanest source
       (`prompt_fields.candidate_1/2/3`, one full comment each, confirmed from a live row); for
       `attribution`/`register`/`suspicion` it's `prompt_fields.candidate` (single text); for
       `standout` it's a single blob `prompt_fields.numbered_comments` requiring index-based
       parsing.
     - `paired_rows.jsonl`'s `stegotext` field, already loaded server-side into `pairedRows`
       (`data.ts:503-515`, via `projectPairedRow`, `data.ts:244-264`, which does keep `stegotext`
       at `data.ts:254`) and turned into `samples` (`data.ts:872-901`), but `page.tsx` does not
       pass `pairedRows` or `samples` into `<LlmJudgePanel>` — only `samples.length`.
  3. **Join key exists and was spot-checked against the live artifact**: judgment rows carry
     `pair_id` as a **string** (e.g. `"100"`) and `post_id`; `paired_rows.jsonl` rows carry
     `pair_id` as a **number** (e.g. `11`) and the same `post_id`. Casting
     `String(pairedRow.pair_id) === judgment.pair_id` joins them. A direct count over the live
     artifact confirmed all 244 unique judgment `pair_id`s are present in `paired_rows.jsonl`'s 244
     unique `pair_id`s (0 missing), so every judged pair can be resolved back to its `stegotext`
     for both `our_method` and `zlg`.
  - **Conclusion:** a quoted example comment *can* be pulled live at render time (the server
    component already has file-system access and the join key checks out on real data), but it
    requires a small, deliberate plumbing change — either (a) pass a `pair_id → {ourText, zlgText}`
    lookup (built from already-loaded `pairedRows`) into `LlmJudgePanel`, or (b) stop dropping
    `prompt_fields` for one pinned judgment row per criterion. Neither exists today. The spec must
    decide, per the docket's own open item (`docs/docket/map.md:30`, "Whether example comments are
    pinned pair ids in the spec, or sampled at render time from the JSONL"), which path to take —
    this inventory confirms both are technically available, it does not decide between them.

## Existing UI primitives available

- `@radix-ui/react-accordion` is a real dependency (`package.json:19`, `"^1.2.12"`), wrapped as
  `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` in
  `src/components/ui/accordion.tsx:1-58`. It is already used in production, not just defined:
  `src/app/_components/file-explorer.tsx`, `src/app/_components/renderers/
  stego-result-renderer.tsx`, `src/app/_components/renderers/stego-result-old-renderer.tsx` all
  import `Accordion` (confirmed via grep, files listed but line numbers not captured in this pass).
- No Radix `Tabs`, `Dialog`, `Popover`, `Collapsible`, or `Tooltip` package is installed
  (`package.json:15-37` full dependency list checked — only `@radix-ui/react-accordion` appears
  under `@radix-ui/*`). Searching the whole `src/` tree for `Tooltip|Popover|Dialog|Collapsible|
  Tabs` turns up only false positives: a recharts chart `Tooltip` import in
  `src/app/_components/stego-process/stego-process-visual.tsx:27`, a native HTML `title` attribute
  misleadingly named `labelTooltip` in `src/app/overnight-findings/page.tsx:278-293`, and a local
  boolean variable named `showViewTabs` in `src/app/_components/parsed-view.tsx:18` that gates
  plain conditional rendering, not a `Tabs` component.
- The panel's own summary/judgments switcher (`llm-judge-panel.tsx:88-99`) is the established
  in-repo pattern for a two-way toggle: `useState` + manually styled buttons, no primitive. Any new
  panel-local tab UI should probably follow this same hand-rolled pattern rather than introduce a
  new Radix dependency, unless the implementation session explicitly wants to add
  `@radix-ui/react-tabs`.
- Net: only expandable-row UI (Accordion) is a ready-made, already-adopted primitive. Tabs/
  popover/tooltip-style disclosure would either reuse the hand-rolled toggle pattern or require
  adding a new dependency.

## research-explainers.tsx

`src/app/_components/research-explainers.tsx` (untracked, per `git status --porcelain`: `?? src/
app/_components/research-explainers.tsx`) exports three functions, all plain server-renderable
JSX with no client state and no data fetching:

- `MethodMap()` (`research-explainers.tsx:41-103`) — a 3-box "where the pieces sit" diagram (LUCID/
  BARB/ZLG) with `Link`s to `/lucid`, `/barb-comparison`, `/zlg-comparison`.
- `LucidExplainer({ here })` (`research-explainers.tsx:105-199`) — a pipeline diagram using local
  `Box`/`ArrowDown` helpers (`research-explainers.tsx:8-39`), for `/lucid` and `/method`.
- `BarbExplainer({ here })` (`research-explainers.tsx:220-327`) — a "what's held constant / what
  changes" diagram plus two example-quote blocks (Balanced vs BARB, `research-explainers.tsx:
  260-284`), for `/barb-comparison` and `/method`.

It **is** wired in: `src/app/barb-comparison/page.tsx:1` imports `BarbExplainer`, `src/app/lucid/
page.tsx:4` imports `LucidExplainer`, `src/app/method/method-content.tsx:20` imports from it
(exact symbol not re-confirmed in this pass, import block spans multiple lines). It is **not**
imported anywhere under `src/app/zlg-comparison/`, and nothing in it references judge criteria,
J1–J5, or judgment data — it is unrelated to the LLM-judge panel apart from being the same
"explainer prose + boxes" genre.

It is a usable **style/pattern** starting point (title + body text boxes, `blockquote`-based
example quotes as in `BarbExplainer`'s "Balanced" vs "BARB" comparison at
`research-explainers.tsx:260-284`, a `tone` prop for color-coding, `here` prop for cross-page
copy variants) but not a usable **code** starting point for the judge panel: it has no accordion/
tab wiring, no data-driven content, and is a set of static, hand-written strings, exactly the kind
of hard-coded prose the docket needs for the explanation blocks (task/chance/direction is static
per criterion) but not a template for the justification blocks, which need to pull a live or
pinned example.

## Markdown export duplication

`src/app/zlg-comparison.md/route.ts` is a separate Next.js route handler (`GET`, `route.ts:34`)
that calls the **same** `loadZlgComparisonData()` (`route.ts:1-5`, `route.ts:35`) and the same
`llm-judge.ts` helpers (`route.ts:7-12`) — so the underlying *numbers* cannot drift, per the file's
own header comment (`route.ts:14-18`, "Same data loader as the interactive page ... so the two
never drift"). But the **prose** is not shared at all:

- The "Interpretation" column strings are re-typed as separate literals in the markdown table
  builder: `"Lower is better; chance is 10%."` (`route.ts:334`), `"Lower is better; chance is
  33%."` (`route.ts:340`), `"AUROC against held-out human; lower is better."` (`route.ts:346`),
  `"Higher is better; chance is 25%."` (`route.ts:352`), `"1-5 score; human-anchor comparison
  follows below."` (`route.ts:358`) — these are **independently hand-typed copies** of the JSX
  strings in `llm-judge-panel.tsx:285-286, 303-304, 312-314, 330-332, 348-350`. They already have
  drifted cosmetically (curly `1–5` vs plain `1-5`), which is exactly the failure mode the docket
  worries about ("weaker export is a bug", `docs/docket/map.md:15`).
- There is no shared constant, JSON config, or `.ts` module holding the five interpretation
  strings (or any future explanation/justification prose) that both `llm-judge-panel.tsx` and
  `route.ts` import from. Every other cross-surface number (rates, means, AUROC) is centralized in
  `_lib/data.ts` / `_lib/llm-judge.ts`; prose strings are the one thing that is copy-pasted per
  surface today.
- **What would have to change to keep prose in sync:** introduce a single source of truth — most
  naturally a new export from `src/app/zlg-comparison/_lib/llm-judge.ts` (already the shared-logic
  module per its own header, `llm-judge.ts:1-5`), e.g. a `JUDGE_EXPLAINERS` record keyed by
  criterion (J1–J5) holding `{ explanation: string; justificationTemplate: (data) => string }` or
  similar, imported by both `llm-judge-panel.tsx` (to render as JSX) and `route.ts` (to render as
  markdown/plain text). This inventory does not design that structure — ticket 08/09's job — but
  confirms no such module exists yet and pinpoints exactly which five literal-string pairs would
  need to collapse into it.

## Insertion points

Ranked options for where the explanation+justification block per criterion could live:

1. **Extra `<tr>` cells or a nested row under the existing "Full-run result" table** —
   touches `llm-judge-panel.tsx:259-354` (the table body) and `route.ts:324-362` (the markdown
   mirror of the same table). Tradeoff: keeps everything in the one place a reader already looks,
   but five rows × (explanation + justification + quote) will make the table very tall or force an
   expandable sub-row (Accordion-style) per criterion — plain always-visible text here would bloat
   the table.
2. **Accordion per criterion below the table, using the existing `Accordion` primitive** — new
   content added after `FullResults` in `LlmJudgePanel` (`llm-judge-panel.tsx:139`), each
   `AccordionItem` (per `src/components/ui/accordion.tsx:1-58`) housing one criterion's explanation
   + justification + quote, collapsed by default. Tradeoff: reuses an already-adopted, already-
   dependency'd primitive (no new package), keeps the compact table as the "at a glance" view and
   pushes prose to an opt-in expand — but the `.md` export has no notion of "collapsed," so
   `route.ts` would render all five expansions unconditionally as flat markdown sections (which is
   fine — arguably better — for an agent-facing export).
3. **Panel-local third tab ("Why", alongside "Summary"/"Judgments")** — touches the tab array at
   `llm-judge-panel.tsx:89` and the `tab === "summary" ? ... : ...` branch at
   `llm-judge-panel.tsx:137-144` (would become a three-way conditional). Tradeoff: keeps the
   "Results at a glance" cards uncluttered, but hides the justification behind an extra click and
   is one more hand-rolled tab state to keep in sync with the `.md` export, which has no tabs at
   all and would just render the new section inline after the existing "LLM Judge" section
   (`route.ts:285` onward).
4. **Always-visible short explanation inline in `ResultCard`'s `note` prop
   (`llm-judge-panel.tsx:359-400`), justification only in the table/accordion below** — touches
   the `note` strings at `llm-judge-panel.tsx:235, 241, 246-247, 253-254` (already exists for
   explanation-lite copy) plus one of options 1-3 for the justification+quote. Tradeoff: cheapest
   change for the "explanation" half (the cards already carry a one-liner), but does not by itself
   solve where the longer justification + quoted example goes.

Recommendation ordering for the implementing session: option 2 (Accordion) reuses an existing,
already-imported dependency, keeps the compact table intact, and maps cleanly onto a markdown
export (accordions become plain `##`/`###` sections with nothing lost). Options 1 and 4 are
smaller but partial. Option 3 adds new state-sync surface for no clear benefit over option 2.

## Limits

- Did not open `src/app/_components/renderers/stego-result-renderer.tsx`, `stego-result-old-
  renderer.tsx`, or `file-explorer.tsx` to confirm exact `Accordion` line numbers — only confirmed
  via grep that they import it.
- Did not fully read `src/app/method/method-content.tsx` to confirm which exact symbols it imports
  from `research-explainers.tsx` beyond the import statement at line 20 (multi-line import).
- Did not read `docs/docket/CONTEXT.md` or the full research/issue backlog beyond `map.md`, issue
  08, and issue 09 — this inventory is scoped to code, not to re-deriving the domain decisions
  already recorded in those files.
- The `prompt_fields`-based text-extraction path (option 2 under "Data path") was verified only by
  spot-reading one live row per metric from the `zlg_lucid_fresh_6x_20260815_independent_unique_
  judge` run directory; it was not verified across all 2,928 judgment rows, so edge cases (e.g. a
  row where `numbered_comments` parsing fails, or `answer.methods` ordering varies) are not ruled
  out.
- Did not check whether any test file (`*.test.ts(x)`) currently covers `llm-judge-panel.tsx` or
  `llm-judge.ts`, which would matter to an implementing session but was out of scope for a code-
  inventory pass.
- Did not verify pyright/typecheck or biome-check cleanliness of any file read — read-only pass per
  task instructions.
