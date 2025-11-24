import { createRouteHandlers } from "@/server/api/handler";
import { requireUser } from "@/server/auth/session";
import { parseRouteParams } from "@/server/http/validation";
import { favoriteClipParamSchema } from "@/server/schemas/favorites.schema";
import { unfavoriteClip } from "@/server/services/favorites";

export const { DELETE } = createRouteHandlers({
  DELETE: async (_req, context) => {
    const user = await requireUser();
    const params = parseRouteParams(context.params, favoriteClipParamSchema);
    await unfavoriteClip(user.id, params.clipId);
    return new Response(null, { status: 204 });
  },
});
