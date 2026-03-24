# AGENTS.md — Stego Results Viewer

Guidance for humans and coding agents working in this repository.

## What this project is

**StegoTest Results Viewer** is a local Next.js application for inspecting JSON artifacts produced by the **stego-side-wing** pipeline (and related metrics). It combines:

- File browsing and structured rendering of result JSON (Zod + dedicated React renderers).
- A **tRPC** backend that reads from the filesystem and a local **SQLite** stats database.
- Pages that call the **external stego-side-wing HTTP API** (documented in `api-spec.md`) for admin/workflows, including SSE streaming.
- Optional streaming of API JSONL logs via a Next.js route handler.

The default README is still the generic Create T3 App template; treat **this file** and the code under `src/` as the source of truth for behavior.

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
| `src/app/` | App Router pages and route-specific UI. Shared UI often under `_components/`. |
| `src/app/admin-api/` | Dashboard for the **external** side-wing API: tabs, tool panels, `fetch-admin-api.ts`, SSE handling, types. |
| `src/app/api/` | Next.js Route Handlers (e.g. prompt-log SSE proxy). |
| `src/server/api/` | tRPC setup (`trpc.ts`), `root.ts` router composition, `routers/*.ts` procedures. |
| `src/server/db/stats.ts` | SQLite (`stats.db` at repo root) schema and connection. |
| `src/server/paths.ts` | Resolves which directory holds result JSON (`side-wing`, `local`, or an absolute path). |
| `src/server/logs/api-log-utils.ts` | Parses side-wing API JSONL lines; defines log file path constant. |
| `src/schemas/` | Zod schemas for result/metric shapes. |
| `src/app/_components/renderers/` | Visualizations matched to schemas via the registry. |
| `schemas/registry.ts` | Registers schema → renderer pairs (first matching `safeParse` wins). |
| `src/trpc/` | Client provider, query client, server helpers. |
| `api-spec.md` | **stego-side-wing** REST/SSE contract (base URL, envelopes, endpoints). |

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
| `/` | File list + viewer for JSON under a resolved results path (`FileViewer` and related components). |
| `/dashboard` | Charts / distribution views over synced stats. |
| `/admin-api` | Explorer for the external side-wing HTTP API (configurable base URL in UI). |
| `/api-logs` | View streamed API JSONL log entries (depends on log path / route implementation). |
| `/prompt-logs` | Prompt log browsing (layout/page under `prompt-logs/`). |
| `/workflows-runs` | Workflow run listing / monitoring UI. |
| `/double-process-new-post` | Focused tool page for that workflow. |

## How to extend the codebase safely

### New tRPC procedures

1. Add procedures under `src/server/api/routers/<domain>.ts` using `createTRPCRouter` and `publicProcedure` from `~/server/api/trpc`.
2. Register the router in `src/server/api/root.ts`.
3. Call from the client with `api.<router>.<procedure>.useQuery/useMutation` from `~/trpc/react` (types flow from `AppRouter`).

**Note:** `publicProcedure` uses a dev-only timing middleware with artificial delay; keep that in mind when profiling.

### New JSON result types

1. Define or extend a Zod schema in `src/schemas/`.
2. Add a renderer component under `src/app/_components/renderers/`.
3. Register in `src/schemas/registry.ts` — **order matters** (first successful parse wins).

### Admin API / side-wing contract

When adding or adjusting calls from `admin-api`, align with `api-spec.md` (envelopes, query params, SSE event types). The UI builds URLs from a user-supplied base (e.g. `http://host:5001/api/v1`).

### SQLite and Node-only code

Keep `better-sqlite3` and filesystem access in server-only code paths (tRPC routers, Route Handlers with `runtime = "nodejs"`). Do not import DB modules into Client Components.

## Quality bar before finishing a change

- Run `pnpm typecheck` and `pnpm check` (or `pnpm check:write` if fixing format/lint).
- No automated test suite is configured in `package.json`; rely on typecheck, Biome, and manual exercise of affected routes.

## Related repositories

- **stego-side-wing**: sibling directory expected for default `side-wing` results and for the HTTP API + JSONL logs this viewer integrates with.
