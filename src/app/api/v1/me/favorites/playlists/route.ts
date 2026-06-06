import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { json } from "@/server/http/json";
import {
  buildCursorPaginationMeta,
  parseCursorPagination,
} from "@/server/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/server/http/validation";
import {
  favoriteListQuerySchema,
  favoritePlaylistBodySchema,
} from "@/server/schemas/favorites.schema";
import {
  favoritePlaylist,
  listMyFavoritePlaylistsCursor,
} from "@/server/services/favorites";

export const { GET, POST } = createRouteHandlers({
  GET: async (req) => {
    const userId = await requireUserId();
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      favoriteListQuerySchema,
    );
    const pagination = parseCursorPagination(query);
    const { data, hasNext, nextCursor } = await listMyFavoritePlaylistsCursor(
      userId,
      {
        cursor: pagination.cursor,
        limit: pagination.limit,
      },
    );
    const meta = buildCursorPaginationMeta(pagination, hasNext, nextCursor);
    return json({ data, meta });
  },
  POST: async (req) => {
    const userId = await requireUserId();
    const body = await parseJsonBody(req, favoritePlaylistBodySchema);
    await favoritePlaylist(userId, body.playlistId);
    return new Response(null, { status: 201 });
  },
});
