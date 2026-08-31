# AGENTS.md — Stego Results Viewer

Guidance for humans and coding agents working in this repository.

## What this project is

**StegoTest Results Viewer** is a local Next.js application for inspecting JSON
artifacts produced by the **stego-side-wing** pipeline. It is a *results*
surface for the two evaluations under active research — the ZLG baseline
comparison and the independent LLM-judge campaign — plus LUCID/BARB and the
method explainer. Benchmarks are CLIs in `stego-side-wing/scripts/`. API and
prompt logs are agent-facing (`GET /api/agent/logs`), not pages.

The default README is still partly a T3 template leftover; treat **this file**,
`docs/revamp-plan.md`, and the code under `src/` as the source of truth.

**Docket** (`docs/docket/map.md`): wayfinder map for explaining and justifying
the five LLM-judge criteria (J1–J5) on `/zlg-comparison`. Pick it up when those
numbers, their copy, or their justifications are in play.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 15 (App Router), React 19 |
| API (in-app) | tRPC v11 + TanStack Query, SuperJSON |
| Validation | Zod |
| Styling | Tailwind CSS 4 |
| Lint / format | Biome (`biome.jsonc`) |
| Native module | `better-sqlite3` (Node runtime; not Edge-compatible) |
| Editor / JSON | CodeMirror (`@uiw/react-codemirror`) |

Path alias: `~/` → `src/` (see `tsconfig.json`).

## Commands

```bash
pnpm install
pnpm dev          # Next dev with Turbopack
pnpm build        # Production build
pnpm typecheck    # tsc --noEmit
pnpm check        # biome check .
pnpm check:write  # biome check --write .
```

## Repository layout (high level)

| Path | Role |
|------|------|
| `src/app/` | App Router pages. Shared UI under `_components/`. |
| `src/app/api/agent/logs/` | Agent-facing JSON of side-wing API/prompt logs. |
| `src/app/api/` | Next.js Route Handlers (tRPC, agent logs, `.md` exports). |
| `src/server/api/` | tRPC setup (`trpc.ts`), `root.ts` router composition, `routers/*.ts`. |
| `src/server/artifact-cache.ts` | mtime-keyed read-through cache for benchmark artifacts. |
| `src/server/db/stats.ts` | SQLite (`stats.db` at repo root) schema and connection. |
| `src/server/paths.ts` | Resolves which directory holds result JSON. |
| `src/server/logs/api-log-utils.ts` | Parses side-wing API JSONL lines. |
| `src/schemas/` | Zod schemas for result/metric shapes. |
| `src/app/_components/renderers/` | Visualizations matched to schemas via the registry. |
| `schemas/registry.ts` | Registers schema → renderer pairs (first matching `safeParse` wins). |
| `src/trpc/` | Client provider, query client, server helpers. |
| `../stego-side-wing/docs/reference/api-spec.md` | Authoritative side-wing REST/SSE contract. |

## Data sources and configuration

### Result JSON directories

`getResolvedPath` in `src/server/paths.ts` maps:

- `side-wing` → `../stego-side-wing/output-results` (relative to this repo’s cwd).
- `local` → `./output-results` in this repo.
- Any other string must be an **absolute** filesystem path.

Many UI surfaces let the user pick or pass a `pathId`; procedures default to `side-wing` where applicable.

### Stats database

- File: `stats.db` at the project root (created/updated by the stats router and workers).
- Uses WAL mode; aggregation uses **worker threads** (`stats-worker.ts`) for CPU-heavy parsing.

### API JSONL log path

`API_LOG_FILE_PATH` in `src/server/logs/api-log-utils.ts` is currently a **hard-coded absolute path** to the side-wing log file. Agents changing environments or deploying should treat this as a known portability footgun: consider env-based configuration if you extend the app.

### Environment variables

`src/env.js` validates `NODE_ENV` via `@t3-oss/env-nextjs`. Add new vars there (server vs client, `NEXT_PUBLIC_*` for browser). `SKIP_ENV_VALIDATION` is supported for builds (see `next.config.js`).

## Main user-facing routes

| Route | Purpose |
|-------|---------|
| `/` | Results explorer (persistent left sidebar). No separate nav entry. |
| `/zlg-comparison` | Our method vs ZLG, plus the independent LLM-judge panel. |
| `/barb-comparison` | BARB encode flavor vs balanced control. |
| `/lucid` | Project LUCID clean-prep + historical 500-run. |
| `/overnight-findings` | Metrics dashboard (latest-run e2e/ablation/gate/feedback/angle-scan). |
| `/stego-process` | Step-by-step visualization of a saved stego result. |
| `/method` | Plain-language method walkthrough, including what LUCID and BARB are. |
| `/workflows-runs` | Live workflow runs in the side-wing API process. |
| `/workflow-llm-prompts` | Workflow LLM prompt templates (read-only). |

Agent-only (no page): `GET /api/agent/logs?source=api\|prompt`. Repeat-determinism
benchmark: `stego-side-wing/scripts/run_single_post_twice_no_cache.py --repeats N`.

## How to extend the codebase safely

### New tRPC procedures

1. Add procedures under `src/server/api/routers/<domain>.ts` using `createTRPCRouter` and `publicProcedure` from `~/server/api/trpc`.
2. Register the router in `src/server/api/root.ts`.
3. Call from the client with `api.<router>.<procedure>.useQuery/useMutation` from `~/trpc/react` (types flow from `AppRouter`).

### New JSON result types

1. Define or extend a Zod schema in `src/schemas/`.
2. Add a renderer component under `src/app/_components/renderers/`.
3. Register in `src/schemas/registry.ts` — **order matters** (first successful parse wins).

### Side-wing HTTP contract

When calling the side-wing API from remaining pages (`workflows-runs`, process
visualizer actions), align with `../stego-side-wing/docs/reference/api-spec.md`.
Base URL helper: `src/lib/side-wing-api.ts`.

### SQLite and Node-only code

Keep `better-sqlite3` and filesystem access in server-only code paths (tRPC routers, Route Handlers with `runtime = "nodejs"`). Do not import DB modules into Client Components.

## Quality bar before finishing a change

- Run `pnpm typecheck` and `pnpm check` (or `pnpm check:write` if fixing format/lint).
- No automated test suite is configured in `package.json`; rely on typecheck, Biome, and manual exercise of affected routes.

## Related repositories

- **stego-side-wing**: sibling directory expected for default `side-wing` results and for the HTTP API + JSONL logs this viewer integrates with.
- **Backend docs (API spec):** `../stego-side-wing/docs/reference/api-spec.md` — authoritative REST/SSE contract for the side-wing HTTP API.
