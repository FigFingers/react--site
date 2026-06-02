import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { parseRouteParams } from "@/server/http/validation";
import { playlistClipParamSchema } from "@/server/schemas/playlists.schema";
import { removeClipFromPlaylist } from "@/server/services/playlists";

export const { DELETE } = createRouteHandlers({
  DELETE: async (_req, context) => {
    const userId = await requireUserId();
    const params = parseRouteParams(context.params, playlistClipParamSchema);
    await removeClipFromPlaylist(userId, params.playlistId, params.clipId);
    return new Response(null, { status: 204 });
  },
});
