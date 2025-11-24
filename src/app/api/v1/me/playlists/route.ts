import { createRouteHandlers } from "@/server/api/handler";
import { requireUser } from "@/server/auth/session";
import { buildPaginationMeta, parsePagination } from "@/server/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/server/http/validation";
import { paginationQuerySchema } from "@/server/schemas/common";
import { playlistCreateBodySchema } from "@/server/schemas/playlists.schema";
import { createPlaylist, listPlaylists } from "@/server/services/playlists";

const routeHandlers = createRouteHandlers({
  GET: async (req) => {
    const user = await requireUser();
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      paginationQuerySchema,
    );
    const pagination = parsePagination(query);
    const { data, total } = await listPlaylists({
      page: pagination.page,
      pageSize: pagination.pageSize,
      includeDeleted: false,
      userId: user.id,
    });
    const meta = buildPaginationMeta(pagination, total);
    return Response.json({ data, meta });
  },
  POST: async (req) => {
    const user = await requireUser();
    const body = await parseJsonBody(req, playlistCreateBodySchema);
    const playlist = await createPlaylist(user.id, body);
    return Response.json(playlist, { status: 201 });
  },
});

export const GET = routeHandlers.GET!;
export const POST = routeHandlers.POST!;
