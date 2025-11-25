import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { buildPaginationMeta, parsePagination } from "@/server/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/server/http/validation";
import { paginationQuerySchema } from "@/server/schemas/common";
import { playlistCreateBodySchema } from "@/server/schemas/playlists.schema";
import { createPlaylist, listPlaylists } from "@/server/services/playlists";

export const { GET, POST } = createRouteHandlers({
  GET: async (req) => {
    const userId = await requireUserId();
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      paginationQuerySchema,
    );
    const pagination = parsePagination(query);
    const { data, total } = await listPlaylists({
      page: pagination.page,
      pageSize: pagination.pageSize,
      includeDeleted: false,
      userId: userId,
    });
    const meta = buildPaginationMeta(pagination, total);
    return Response.json({ data, meta });
  },
  POST: async (req) => {
    const userId = await requireUserId();
    const body = await parseJsonBody(req, playlistCreateBodySchema);
    const playlist = await createPlaylist(userId, body);
    return Response.json(playlist, { status: 201 });
  },
});
