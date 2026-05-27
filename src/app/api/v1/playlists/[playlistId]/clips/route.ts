import { createRouteHandlers } from "@/server/api/handler";
import { json } from "@/server/http/json";
import {
  buildCursorPaginationMeta,
  parseCursorPagination,
} from "@/server/http/pagination";
import { parseRouteParams, parseSearchParams } from "@/server/http/validation";
import {
  playlistChildrenCursorQuerySchema,
  playlistIdParamSchema,
} from "@/server/schemas/playlists.schema";
import { listPlaylistClipsCursor } from "@/server/services/playlists";

export const { GET } = createRouteHandlers({
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
});
