import { createRouteHandlers } from "@/server/api/handler";
import { json } from "@/server/http/json";
import { parseRouteParams } from "@/server/http/validation";
import { vodIdParamSchema } from "@/server/schemas/vods.schema";
import { getVod } from "@/server/services/vods";

export const { GET } = createRouteHandlers({
  GET: async (_req, context) => {
    const params = parseRouteParams(context.params, vodIdParamSchema);
    const vod = await getVod(params.vodId);
    return json(vod);
  },
});
