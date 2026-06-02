import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { json } from "@/server/http/json";
import {
  buildCursorPaginationMeta,
  parseCursorPagination,
} from "@/server/http/pagination";
import {
  parseJsonBody,
  parseRouteParams,
  parseSearchParams,
} from "@/server/http/validation";
import {
  playlistChildrenCursorQuerySchema,
  playlistClipBodySchema,
  playlistIdParamSchema,
} from "@/server/schemas/playlists.schema";
import {
  addClipToPlaylist,
  listPlaylistClipsCursor,
} from "@/server/services/playlists";

export const { GET, POST } = createRouteHandlers({
  GET: async (req, context) => {
    const params = parseRouteParams(context.params, playlistIdParamSchema);
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      playlistChildrenCursorQuerySchema,
    );
    const pagination = parseCursorPagination(query);
    const { data, hasNext, nextCursor } = await listPlaylistClipsCursor(
      params.playlistId,
      {
        cursor: pagination.cursor,
        limit: pagination.limit,
      },
    );
    const meta = buildCursorPaginationMeta(pagination, hasNext, nextCursor);
    return json({ data, meta });
  },
  POST: async (req, context) => {
    const userId = await requireUserId();
    const params = parseRouteParams(context.params, playlistIdParamSchema);
    const body = await parseJsonBody(req, playlistClipBodySchema);
    await addClipToPlaylist(userId, params.playlistId, body.clipId);
    return json({ ok: true }, { status: 201 });
  },
});
