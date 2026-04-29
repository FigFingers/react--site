# API v1 Inventory

This document compares `openapi/v1.yaml` with the current Next.js route handlers under `src/app/api/v1`.

## Summary

- OpenAPI defines 54 operations.
- Current `/api/v1` implementation provides 22 operations.
- All currently implemented `/api/v1` operations are present in `openapi/v1.yaml`.
- 32 OpenAPI operations are not yet implemented.

## Implemented

| Method | Path | OpenAPI operationId | Route file |
| --- | --- | --- | --- |
| GET | `/health` | `utilities.health` | `src/app/api/v1/health/route.ts` |
| GET | `/me` | `users.meGet` | `src/app/api/v1/me/route.ts` |
| GET | `/me/playlists` | `me.playlists.list` | `src/app/api/v1/me/playlists/route.ts` |
| POST | `/me/playlists` | `me.playlists.create` | `src/app/api/v1/me/playlists/route.ts` |
| GET | `/me/vods` | `me.vods.list` | `src/app/api/v1/me/vods/route.ts` |
| POST | `/me/vods` | `me.vods.add` | `src/app/api/v1/me/vods/route.ts` |
| DELETE | `/me/vods/{vodId}` | `me.vods.remove` | `src/app/api/v1/me/vods/[vodId]/route.ts` |
| GET | `/me/favorites/clips` | `me.favorites.clips.list` | `src/app/api/v1/me/favorites/clips/route.ts` |
| POST | `/me/favorites/clips` | `me.favorites.clips.add` | `src/app/api/v1/me/favorites/clips/route.ts` |
| DELETE | `/me/favorites/clips/{clipId}` | `me.favorites.clips.remove` | `src/app/api/v1/me/favorites/clips/[clipId]/route.ts` |
| GET | `/me/favorites/playlists` | `me.favorites.playlists.list` | `src/app/api/v1/me/favorites/playlists/route.ts` |
| POST | `/me/favorites/playlists` | `me.favorites.playlists.add` | `src/app/api/v1/me/favorites/playlists/route.ts` |
| DELETE | `/me/favorites/playlists/{playlistId}` | `me.favorites.playlists.remove` | `src/app/api/v1/me/favorites/playlists/[playlistId]/route.ts` |
| GET | `/clips` | `clips.list` | `src/app/api/v1/clips/route.ts` |
| POST | `/clips` | `clips.create` | `src/app/api/v1/clips/route.ts` |
| GET | `/clips/{clipId}` | `clips.get` | `src/app/api/v1/clips/[clipId]/route.ts` |
| PATCH | `/clips/{clipId}` | `clips.update` | `src/app/api/v1/clips/[clipId]/route.ts` |
| DELETE | `/clips/{clipId}` | `clips.delete` | `src/app/api/v1/clips/[clipId]/route.ts` |
| POST | `/clips/{clipId}/view` | `clips.viewIncrement` | `src/app/api/v1/clips/[clipId]/view/route.ts` |
| GET | `/vods` | `vods.list` | `src/app/api/v1/vods/route.ts` |
| GET | `/vods/{vodId}` | `vods.get` | `src/app/api/v1/vods/[vodId]/route.ts` |
| GET | `/vods/{vodId}/aliases` | `vods.aliases.list` | `src/app/api/v1/vods/[vodId]/aliases/route.ts` |

## Missing From Implementation

| Area | Method | Path | OpenAPI operationId | Permission |
| --- | --- | --- | --- | --- |
| Users | GET | `/users` | `users.list` | `admin` |
| Users | POST | `/users` | `users.create` | `admin` |
| Users | GET | `/users/{id}` | `users.get` | `admin` |
| Users | PATCH | `/users/{id}` | `users.update` | `admin` |
| Users | DELETE | `/users/{id}` | `users.delete` | `admin` |
| VODs | POST | `/vods` | `vods.create` | `admin` |
| VODs | PATCH | `/vods/{vodId}` | `vods.update` | `admin` |
| VODs | DELETE | `/vods/{vodId}` | `vods.delete` | `admin` |
| VODs | POST | `/vods/{vodId}/aliases` | `vods.aliases.create` | `admin` |
| VODs | PATCH | `/vods/{vodId}/aliases/{aliasId}` | `vods.aliases.update` | `admin` |
| VODs | DELETE | `/vods/{vodId}/aliases/{aliasId}` | `vods.aliases.delete` | `admin` |
| Playlists | GET | `/playlists` | `playlists.list` | `public` |
| Playlists | POST | `/playlists` | `playlists.create` | `auth` |
| Playlists | GET | `/playlists/{playlistId}` | `playlists.get` | `public` |
| Playlists | PATCH | `/playlists/{playlistId}` | `playlists.update` | `ownerOrAdmin` |
| Playlists | DELETE | `/playlists/{playlistId}` | `playlists.delete` | `ownerOrAdmin` |
| Playlists | GET | `/playlists/{playlistId}/clips` | `playlists.clips.list` | `public` |
| Playlists | POST | `/playlists/{playlistId}/clips` | `playlists.clips.add` | `ownerOrAdmin` |
| Playlists | DELETE | `/playlists/{playlistId}/clips/{clipId}` | `playlists.clips.remove` | `ownerOrAdmin` |
| Playlists | GET | `/playlists/{playlistId}/vods` | `playlists.vods.list` | `public` |
| Playlists | POST | `/playlists/{playlistId}/vods` | `playlists.vods.add` | `ownerOrAdmin` |
| Playlists | DELETE | `/playlists/{playlistId}/vods/{vodId}` | `playlists.vods.remove` | `ownerOrAdmin` |
| Users | GET | `/users/{userId}/vods` | `users.vods.list` | `owner` |
| Users | POST | `/users/{userId}/vods` | `users.vods.add` | `owner` |
| Users | DELETE | `/users/{userId}/vods/{vodId}` | `users.vods.remove` | `owner` |
| Favorites | GET | `/favorites/clips` | `favorites.clips.list` | `auth` |
| Favorites | POST | `/favorites/clips` | `favorites.clips.add` | `auth` |
| Favorites | DELETE | `/favorites/clips/{clipId}` | `favorites.clips.remove` | `auth` |
| Favorites | GET | `/favorites/playlists` | `favorites.playlists.list` | `auth` |
| Favorites | POST | `/favorites/playlists` | `favorites.playlists.add` | `auth` |
| Favorites | DELETE | `/favorites/playlists/{playlistId}` | `favorites.playlists.remove` | `auth` |
| Search | GET | `/search` | `search.query` | `public` |

## Implementation Readiness

Likely straightforward route additions because service/schema/repository code already exists:

- `/vods` and `/vods/{vodId}/aliases` write endpoints, once admin authorization exists.
- `/playlists`, `/playlists/{playlistId}`, `/playlists/{playlistId}/clips`, `/playlists/{playlistId}/vods`
- `/favorites/clips`, `/favorites/playlists`, if these are intended as aliases for the implemented `/me/favorites/*` endpoints.
- `/users/{userId}/vods`, if these are intended as aliases for the implemented `/me/vods` endpoints with owner checks.

Needs design or policy work before implementation:

- Admin authorization for `x-permission: admin` and admin bypass for `ownerOrAdmin`; the current auth helper only provides current-user checks.
- OpenAPI says cursor pagination for list endpoints, but several existing schemas/repositories still use `page` and `pageSize`.
- `/search` has a schema but no service/repository implementation.
- Duplicate endpoint families exist in the spec: `/me/favorites/*` and `/favorites/*`, plus `/me/vods` and `/users/{userId}/vods`. Decide whether both should remain or whether one family should be removed from the spec.

## Notes

- Existing `/api/v1` implementation follows the shared `createRouteHandlers` pattern and central error handling.
- Current implemented `/me/*` list endpoints use cursor pagination and return `{ data, meta }`.
- Current implemented `/clips` list endpoint uses cursor pagination and returns `{ data, meta }`.
- Current implemented `/vods` and `/vods/{vodId}/aliases` list endpoints use cursor pagination and return `{ data, meta }`.
- `PATCH /clips/{clipId}` and `DELETE /clips/{clipId}` are implemented with owner checks only; admin bypass still depends on future admin authorization.
- Some non-`/me` schemas currently use offset pagination (`page`, `pageSize`), which does not match `openapi/v1.yaml`.
