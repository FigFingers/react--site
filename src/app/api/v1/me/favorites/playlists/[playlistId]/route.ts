import { createRouteHandlers } from "@/server/api/handler";
import { requireUser } from "@/server/auth/session";
import { parseRouteParams } from "@/server/http/validation";
import { favoritePlaylistParamSchema } from "@/server/schemas/favorites.schema";
import { unfavoritePlaylist } from "@/server/services/favorites";

const routeHandlers = createRouteHandlers({
  DELETE: async (_req, context) => {
    const user = await requireUser();
    const params = parseRouteParams(
      context.params,
      favoritePlaylistParamSchema,
    );
    await unfavoritePlaylist(user.id, params.playlistId);
    return new Response(null, { status: 204 });
  },
});

export const DELETE = routeHandlers.DELETE!;
