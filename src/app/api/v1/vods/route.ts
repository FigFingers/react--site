import { createRouteHandlers } from "@/server/api/handler";
import { json } from "@/server/http/json";
import {
  buildCursorPaginationMeta,
  parseCursorPagination,
} from "@/server/http/pagination";
import { parseSearchParams } from "@/server/http/validation";
import { vodCursorListQuerySchema } from "@/server/schemas/vods.schema";
import { listVodsCursor } from "@/server/services/vods";

export const { GET } = createRouteHandlers({
  GET: async (req) => {
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      vodCursorListQuerySchema,
    );
    const pagination = parseCursorPagination(query);
    const { data, hasNext, nextCursor } = await listVodsCursor({
      cursor: pagination.cursor,
      limit: pagination.limit,
      code: query.code,
      name: query.name,
      includeDeleted: false,
    });
    const meta = buildCursorPaginationMeta(pagination, hasNext, nextCursor);
    return json({ data, meta });
  },
});
