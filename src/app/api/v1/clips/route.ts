import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { json } from "@/server/http/json";
import {
  buildCursorPaginationMeta,
  parseCursorPagination,
} from "@/server/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/server/http/validation";
import {
  clipCreateBodySchema,
  clipCursorListQuerySchema,
} from "@/server/schemas/clips.schema";
import { createClip, listClipsCursor } from "@/server/services/clips";

export const { GET, POST } = createRouteHandlers({
  GET: async (req) => {
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      clipCursorListQuerySchema,
    );
    const pagination = parseCursorPagination(query);
    const { data, hasNext, nextCursor } = await listClipsCursor({
      cursor: pagination.cursor,
      limit: pagination.limit,
      userId: query.userId,
      vodId: query.vodId,
      title: query.title,
      includeDeleted: false,
    });
    const meta = buildCursorPaginationMeta(pagination, hasNext, nextCursor);
    return json({ data, meta });
  },
  POST: async (req) => {
    const userId = await requireUserId();
    const body = await parseJsonBody(req, clipCreateBodySchema);
    const clip = await createClip(userId, body);
    return json(clip, { status: 201 });
  },
});
