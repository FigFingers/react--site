import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import {
  buildCursorPaginationMeta,
  parseCursorPagination,
} from "@/server/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/server/http/validation";
import { cursorPaginationQuerySchema } from "@/server/schemas/common";
import { userVodBodySchema } from "@/server/schemas/users.schema";
import { addUserVod, listUserVodsCursor } from "@/server/services/users";

export const { GET, POST } = createRouteHandlers({
  GET: async (req) => {
    const userId = await requireUserId();
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      cursorPaginationQuerySchema,
    );
    const pagination = parseCursorPagination(query);
    const { data, hasNext, nextCursor } = await listUserVodsCursor(userId, {
      cursor: pagination.cursor,
      limit: pagination.limit,
    });
    const meta = buildCursorPaginationMeta(pagination, hasNext, nextCursor);
    return Response.json({ data, meta });
  },
  POST: async (req) => {
    const userId = await requireUserId();
    const body = await parseJsonBody(req, userVodBodySchema);
    await addUserVod(userId, userId, body.vodId);
    return new Response(null, { status: 201 });
  },
});
