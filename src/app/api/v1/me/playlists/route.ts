import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import {
  buildCursorPaginationMeta,
  parseCursorPagination,
} from "@/server/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/server/http/validation";
import { cursorPaginationQuerySchema } from "@/server/schemas/common";
import { playlistCreateBodySchema } from "@/server/schemas/playlists.schema";
import {
  createPlaylist,
  listPlaylistsCursor,
} from "@/server/services/playlists";

export const { GET, POST } = createRouteHandlers({
  GET: async (req) => {
    const userId = await requireUserId();
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      cursorPaginationQuerySchema,
    );
    const pagination = parseCursorPagination(query);
    const { data, hasNext, nextCursor } = await listPlaylistsCursor({
      cursor: pagination.cursor,
      limit: pagination.limit,
      includeDeleted: false,
      userId: userId,
    });
    const meta = buildCursorPaginationMeta(pagination, hasNext, nextCursor);
    return Response.json({ data, meta });
  },
  POST: async (req) => {
    const userId = await requireUserId();
    const body = await parseJsonBody(req, playlistCreateBodySchema);
    const playlist = await createPlaylist(userId, body);
    return Response.json(playlist, { status: 201 });
  },
});
