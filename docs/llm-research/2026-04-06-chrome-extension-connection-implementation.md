# Chrome Extension Connection Implementation

- Date: 2026-04-06
- Author: LLM
- Status: historical note
- Scope: Explain the extension connection flow, API routes, Prisma changes, and the shared clip write service as implemented during the AuthForExtension draft work

## Question

How was the Chrome extension connection mechanism implemented in this repository after the April 6 research memo?

## Conclusion

The implementation added a dedicated `/api/extension/` namespace, moved clip persistence into a shared service, and introduced hashed extension tokens plus link tokens backed by Prisma. The current integration branch keeps that flow, but the implementation paths now live under the `src/server/*` API/service structure.

The extension does not call `/api/receive` directly. It uses `Authorization: Bearer [extensionAuthToken]` together with `extensionInstanceId`, and sync idempotency is enforced by `SyncReceipt`.

## Evidence

### Code

- `prisma/schema.prisma`
- `prisma/migrations/20260430010000_init/migration.sql`
- `src/server/services/extensions.ts`
- `src/server/services/legacy-clips.ts`
- `src/server/http/cors.ts`
- `src/app/api/receive/route.js`
- `src/app/api/extension/session/route.ts`
- `src/app/api/extension/link-token/route.ts`
- `src/app/api/extension/link/route.ts`
- `src/app/api/extension/sync/route.ts`

### Notes

- `Clip.userId` is the owning user relation in the current DB redesign.
- `LinkedExtension` stores `extensionInstanceId` and `extensionAuthHash`.
- `ExtensionLinkToken` stores only `tokenHash`, `expiresAt`, and `usedAt`.
- `SyncReceipt` prevents duplicate saves per `(linkedExtensionId, clientItemId)`.
- `src/app/api/receive/route.js` now delegates writes through `src/server/services/legacy-clips.ts`.
- `src/server/http/cors.ts` now allows the `Authorization` header for extension preflight and actual responses.
- `POST /api/extension/link` returns the plaintext `extensionAuthToken` once and stores only its hash.
- `POST /api/extension/sync` authenticates with `extensionInstanceId` plus bearer token, never with UUID alone.
- Verification should use `npx prisma validate`, `npx tsc --noEmit --pretty false`, and the extension link/sync smoke flow.

## Unknowns

- Token revocation and rotation UI are not implemented.
- Extension-side storage and reconnect policy are outside this repository.

## Recommendation

Recommendation: Use `/api/extension/*` as the supported extension write path and keep `/api/receive` only as the legacy session based ingest path.

Inference: Keeping the extension write path separate from general CRUD APIs is less risky because extension sync has retry, idempotency, and cross-origin requirements.

## Next Actions

1. Add a revoke or rotate flow for `extensionAuthToken`.
2. Decide whether existing `Clip.user` rows should be backfilled into `Clip.userId`.
3. Add integration tests for link token single use and sync idempotency.

## Related

- `docs/integration-extension-merge-notes.md`
- `openapi/v1.yaml`
