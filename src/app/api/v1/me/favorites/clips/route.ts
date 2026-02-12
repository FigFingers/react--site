import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { buildPaginationMeta, parsePagination } from "@/server/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/server/http/validation";
import {
  favoriteClipBodySchema,
  favoriteListQuerySchema,
} from "@/server/schemas/favorites.schema";
import { favoriteClip, listMyFavoriteClips } from "@/server/services/favorites";

export const { GET, POST } = createRouteHandlers({
  GET: async (req) => {
    const userId = await requireUserId();
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      favoriteListQuerySchema,
    );
    const pagination = parsePagination(query);
    const { data, total } = await listMyFavoriteClips(userId, {
      skip: pagination.skip,
      take: pagination.take,
    });
    const meta = buildPaginationMeta(pagination, total);
    return Response.json({ data, meta });
  },
  POST: async (req) => {
    const userId = await requireUserId();
    const body = await parseJsonBody(req, favoriteClipBodySchema);
    await favoriteClip(userId, body.clipId);
    return new Response(null, { status: 201 });
  },
});
