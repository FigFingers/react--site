import { createRouteHandlers } from "@/server/api/handler";
import { requireUser } from "@/server/auth/session";
import { parseRouteParams } from "@/server/http/validation";
import { vodIdParamSchema } from "@/server/schemas/vods.schema";
import { removeUserVod } from "@/server/services/users";

export const { DELETE } = createRouteHandlers({
  DELETE: async (_req, context) => {
    const user = await requireUser();
    const params = parseRouteParams(context.params, vodIdParamSchema);
    await removeUserVod(user.id, user.id, params.vodId);
    return new Response(null, { status: 204 });
  },
});
