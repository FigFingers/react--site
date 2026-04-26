import { createRouteHandlers } from "@/server/api/handler";
import { parseRouteParams } from "@/server/http/validation";
import { clipIdParamSchema } from "@/server/schemas/clips.schema";
import { incrementClipViews } from "@/server/services/clips";

export const { POST } = createRouteHandlers({
  POST: async (_req, context) => {
    const params = parseRouteParams(context.params, clipIdParamSchema);
    await incrementClipViews(params.clipId);
    return new Response(null, { status: 204 });
  },
});
