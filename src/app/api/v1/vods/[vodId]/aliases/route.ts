import { createRouteHandlers } from "@/server/api/handler";
import { json } from "@/server/http/json";
import {
  buildCursorPaginationMeta,
  parseCursorPagination,
} from "@/server/http/pagination";
import { parseRouteParams, parseSearchParams } from "@/server/http/validation";
import {
  vodAliasCursorListQuerySchema,
  vodIdParamSchema,
} from "@/server/schemas/vods.schema";
import { listVodAliasesCursor } from "@/server/services/vods";

export const { GET } = createRouteHandlers({
  GET: async (req, context) => {
    const params = parseRouteParams(context.params, vodIdParamSchema);
    const query = parseSearchParams(
      req.nextUrl.searchParams,
      vodAliasCursorListQuerySchema,
    );
    const pagination = parseCursorPagination(query);
    const { data, hasNext, nextCursor } = await listVodAliasesCursor(
      params.vodId,
      {
        cursor: pagination.cursor,
        limit: pagination.limit,
      },
    );
    const meta = buildCursorPaginationMeta(pagination, hasNext, nextCursor);
    return json({ data, meta });
  },
});
