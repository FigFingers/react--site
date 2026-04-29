import { createRouteHandlers } from "@/server/api/handler";
import { json } from "@/server/http/json";
import {
  buildCursorPaginationMeta,
  parseCursorPagination,
} from "@/server/http/pagination";
import { parseSearchParams } from "@/server/http/validation";
import { playlistCursorListQuerySchema } from "@/server/schemas/playlists.schema";
import { listPlaylistsCursor } from "@/server/services/playlists";

export const { GET } = createRouteHandlers({
  GET: async (req) => {
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      playlistCursorListQuerySchema,
    );
    const pagination = parseCursorPagination(query);
    const { data, hasNext, nextCursor } = await listPlaylistsCursor({
      cursor: pagination.cursor,
      limit: pagination.limit,
      userId: query.userId,
      name: query.name,
      includeDeleted: false,
    });
    const meta = buildCursorPaginationMeta(pagination, hasNext, nextCursor);
    return json({ data, meta });
  },
});
