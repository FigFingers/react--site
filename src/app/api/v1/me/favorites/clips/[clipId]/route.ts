import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { parseRouteParams } from "@/server/http/validation";
import { favoriteClipParamSchema } from "@/server/schemas/favorites.schema";
import { unfavoriteClip } from "@/server/services/favorites";

export const { DELETE } = createRouteHandlers({
  DELETE: async (_req, context) => {
    const userId = await requireUserId();
    const params = parseRouteParams(context.params, favoriteClipParamSchema);
    await unfavoriteClip(userId, params.clipId);
    return new Response(null, { status: 204 });
  },
});
