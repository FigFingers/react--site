# Chrome Extension Connection Implementation

- Date: 2026-04-06
- Author: LLM
- Status: draft
- Scope: Explain the implemented extension connection flow, API routes, Prisma changes, and the shared clip write service

## Question

How was the Chrome extension connection mechanism implemented in this repository after the April 6 research memo?

## Conclusion

The implementation added a dedicated `/api/extension/` namespace, moved clip persistence into a shared service, and introduced hashed extension tokens plus link tokens backed by Prisma.

The extension does not call `/api/receive` directly. It uses `Authorization: Bearer [extensionAuthToken]` together with `extensionInstanceId`, and sync idempotency is enforced by `SyncReceipt`.

## Evidence

### Code

- `prisma/schema.prisma`
- `prisma/migrations/20260406043418_add_extension_connection/migration.sql`
- `src/lib/clips/service.ts`
- `src/lib/extension/service.ts`
- `src/lib/api/cors.ts`
- `src/app/api/receive/route.js`
- `src/app/api/extension/session/route.ts`
- `src/app/api/extension/link-token/route.ts`
- `src/app/api/extension/link/route.ts`
- `src/app/api/extension/sync/route.ts`

### Notes

- `Clip.userId` was added as a nullable relation to `User`.
- `Clip.user` was kept for compatibility with existing UI, search, and cookie handoff code.
- `LinkedExtension` stores `extensionInstanceId` and `extensionAuthHash`.
- `ExtensionLinkToken` stores only `tokenHash`, `expiresAt`, and `usedAt`.
- `SyncReceipt` prevents duplicate saves per `(linkedExtensionId, clientItemId)`.
- `src/app/api/receive/route.js` now delegates writes to `src/lib/clips/service.ts`.
- `src/lib/api/cors.ts` now allows the `Authorization` header for extension preflight and actual responses.
- `POST /api/extension/link` returns the plaintext `extensionAuthToken` once and stores only its hash.
- `POST /api/extension/sync` authenticates with `extensionInstanceId` plus bearer token, never with UUID alone.
- Verification used `npx prisma migrate dev --name add_extension_connection` and `npm run build`.

## Unknowns

- Old `Clip` rows are not backfilled from `user` text to `userId`.
- Token revocation and rotation UI are not implemented.
- Extension-side storage and reconnect policy are outside this repository.

## Recommendation

Recommendation: Use `/api/extension/*` as the supported extension write path and keep `/api/receive` only as the legacy session based ingest path.

Inference: Keeping `Clip.user` during the transition is less risky than rewriting all existing read paths in the same change.

## Next Actions

1. Add a revoke or rotate flow for `extensionAuthToken`.
2. Decide whether existing `Clip.user` rows should be backfilled into `Clip.userId`.
3. Add integration tests for link token single use and sync idempotency.

## Related

- `docs/readme-for-llm.md`
- `docs/llm-research/2026-04-06-chrome-extension-connection-research.md`
- `docs/llm-research/conventions.md`
