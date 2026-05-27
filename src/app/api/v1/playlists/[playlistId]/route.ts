import { createRouteHandlers } from "@/server/api/handler";
import { json } from "@/server/http/json";
import { parseRouteParams } from "@/server/http/validation";
import { playlistIdParamSchema } from "@/server/schemas/playlists.schema";
import { getPlaylist } from "@/server/services/playlists";

export const { GET } = createRouteHandlers({
  GET: async (_req, context) => {
    const params = parseRouteParams(context.params, playlistIdParamSchema);
    const playlist = await getPlaylist(params.playlistId);
    return json(playlist);
  },
});
