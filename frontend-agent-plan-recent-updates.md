# Frontend Plan: Recent Updates Showcase

## Goal
Render a new UI panel/page that shows recent backend work using:

- `GET /api/v1/state/recent-updates?days=<int>&limit=<int>`
- Backend repo: `stego-side-wing`

## API contract to use
Response envelope:

```json
{
  "ok": true,
  "data": {
    "generated_at_utc": "2026-04-26T09:35:00+00:00",
    "days": 7,
    "limit": 20,
    "count": 5,
    "authors": ["nasooh"],
    "top_paths": [{ "path": "src/workflows/pipelines/stego.py", "touches": 2 }],
    "commits": [
      {
        "commit": "ba0234...",
        "short_commit": "ba02343",
        "author": "nasooh",
        "committed_at": "2026-04-25T05:34:57+03:00",
        "subject": "clean up repo",
        "files_changed_total": 1342,
        "files_changed_visible": 40,
        "generated_files_changed": 1302,
        "insertions": 292,
        "deletions": 2688759,
        "paths": ["src/workflows/utils/stego_codec.py"],
        "has_more_paths": true
      }
    ]
  }
}
```

## Implementation steps
1. Add types in `src/app/admin-api/types.ts` (or nearest shared types file).
2. Add fetch helper in `src/app/admin-api/fetch-admin-api.ts`:
   - `fetchRecentUpdates(baseUrl, { days, limit })`
3. Add a new tab in `/admin-api` named `Recent Updates`.
4. Build `RecentUpdatesPanel` with:
   - controls: `days` (1-90), `limit` (1-100), refresh button
   - summary row: commit count, authors, generated timestamp
   - commits table/cards: date, subject, author, churn, visible/generated file counts
   - per-commit changed paths list (`paths`) + small `+N more` when `has_more_paths=true`
   - top touched paths block from `top_paths`
5. Add UI states:
   - loading skeleton
   - empty (`count=0`)
   - API error (`ok=false` or network failure)

## UX constraints
- Keep it dense and dashboard-like (not marketing layout).
- Cap rendered paths per commit to what backend sends; do not infer missing paths.
- Format timestamps in local time with tooltip showing raw ISO string.
- Format large numbers (`insertions`, `deletions`) with separators.

## Acceptance checklist
- Changing `days` and `limit` triggers refetch with correct query params.
- Handles very large cleanup commits without freezing UI.
- Correctly shows `generated_files_changed` vs `files_changed_visible`.
- Works when API base URL points to another host in admin settings.
- No TypeScript or lint errors.
