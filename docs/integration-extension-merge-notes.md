# Extension Integration Notes

## Status

The `15-DBMigration` branch now contains the extension connection foundation on top of the redesigned Prisma/API stack.

Included:

- cross-site aware auth cookie configuration
- legacy `/api/receive` hardened behind auth and origin checks
- extension routes:
  - `/api/extension/session`
  - `/api/extension/link-token`
  - `/api/extension/link`
  - `/api/extension/sync`
- DB tables:
  - `linked_extensions`
  - `extension_link_tokens`
  - `sync_receipts`
- single rebuilt init migration with `prisma-augment` output included

## Remaining Work Before `develop`

1. Decide whether selected non-extension features from `origin/AuthForExtension-draft` belong in this merge.
2. Run a final merge/conflict check against `develop`.

## Verification Status

Completed against the local Next.js dev server:

- `GET /api/extension/session` returns `200` with `{"loggedIn":false}` when unauthenticated
- `POST /api/extension/link-token` returns `401` when unauthenticated
- `POST /api/extension/link` returns `400` for an invalid body
- `POST /api/extension/sync` returns `401` when unauthenticated
- signed-in browser flow succeeds for `link-token -> link -> sync`
- repeated `sync` with the same `clientItemId` returns `200` and is idempotent
- `npx tsc --noEmit --pretty false` passes after normalizing authenticated user ids at the API boundary

## Classification Of Remaining Draft Differences

### Adoptable with redesign work

- nickname editing UI and API
  This is useful, but it needs a fresh schema/service design because the current `User` model does not yet contain `nickname` fields.
- search improvements
  The scoring idea is reusable, but the draft implementation depends on the old clip schema and old route layout.
- playlist detail UI
  The draft contains UI work that may still be useful, but it should be handled as a separate frontend task because the current branch already has the redesigned v1 playlist API.

### Not adopted

- old Prisma schema and old migration history
- old `/api/playlists/*`, `/api/search/*`, `/api/clips/*` route family
- old `src/lib/*` service layer that bypasses `src/server`
- SQLite/dev.db based artifacts
- JWT/UUID-only extension auth rewrites from the draft
  The current branch uses link tokens plus per-extension bearer tokens with `sync_receipts`, and this has been verified end-to-end.

### Already integrated conceptually

- extension cookie handling
- link-token/link/sync handshake
- authenticated and origin-scoped clip ingest
- sync idempotency via receipts

## Merge Recommendation

Do not merge `origin/AuthForExtension-draft` directly.

Use `15-DBMigration` as the base and selectively reimplement any remaining wanted behavior on top of the current stack.

## Legacy `/api/receive` Policy

`/api/receive` should remain only as a temporary compatibility path for old clients.

- Keep it auth-required and origin-scoped
- Do not add new extension-only behavior to it
- Route all new extension work to `/api/extension/*`
- Remove `/api/receive` after the extension client has been migrated
