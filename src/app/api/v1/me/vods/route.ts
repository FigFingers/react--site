import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { buildPaginationMeta, parsePagination } from "@/server/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/server/http/validation";
import { paginationQuerySchema } from "@/server/schemas/common";
import { userVodBodySchema } from "@/server/schemas/users.schema";
import { addUserVod, listUserVods } from "@/server/services/users";

export const { GET, POST } = createRouteHandlers({
  GET: async (req) => {
    const userId = await requireUserId();
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      paginationQuerySchema,
    );
    const pagination = parsePagination(query);
    const { data, total } = await listUserVods(userId, {
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    const meta = buildPaginationMeta(pagination, total);
    return Response.json({ data, meta });
  },
  POST: async (req) => {
    const userId = await requireUserId();
    const body = await parseJsonBody(req, userVodBodySchema);
    await addUserVod(userId, userId, body.vodId);
    return new Response(null, { status: 201 });
  },
});
