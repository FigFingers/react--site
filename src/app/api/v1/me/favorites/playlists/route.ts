import { createRouteHandlers } from "@/server/api/handler";
import { requireUser } from "@/server/auth/session";
import { buildPaginationMeta, parsePagination } from "@/server/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/server/http/validation";
import {
  favoriteListQuerySchema,
  favoritePlaylistBodySchema,
} from "@/server/schemas/favorites.schema";
import {
  favoritePlaylist,
  listMyFavoritePlaylists,
} from "@/server/services/favorites";

const routeHandlers = createRouteHandlers({
  GET: async (req) => {
    const user = await requireUser();
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      favoriteListQuerySchema,
    );
    const pagination = parsePagination(query);
    const { data, total } = await listMyFavoritePlaylists(user.id, {
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    const meta = buildPaginationMeta(pagination, total);
    return Response.json({ data, meta });
  },
  POST: async (req) => {
    const user = await requireUser();
    const body = await parseJsonBody(req, favoritePlaylistBodySchema);
    await favoritePlaylist(user.id, body.playlistId);
    return new Response(null, { status: 201 });
  },
});

export const GET = routeHandlers.GET!;
export const POST = routeHandlers.POST!;
