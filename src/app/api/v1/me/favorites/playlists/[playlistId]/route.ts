import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { parseRouteParams } from "@/server/http/validation";
import { favoritePlaylistParamSchema } from "@/server/schemas/favorites.schema";
import { unfavoritePlaylist } from "@/server/services/favorites";

export const { DELETE } = createRouteHandlers({
  DELETE: async (_req, context) => {
    const userId = await requireUserId();
    const params = parseRouteParams(
      context.params,
      favoritePlaylistParamSchema,
    );
    await unfavoritePlaylist(userId, params.playlistId);
    return new Response(null, { status: 204 });
  },
});
