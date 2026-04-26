import { createRouteHandlers } from "@/server/api/handler";
import { requireUserId } from "@/server/auth/session";
import { json } from "@/server/http/json";
import { parseJsonBody, parseRouteParams } from "@/server/http/validation";
import {
  clipIdParamSchema,
  clipUpdateBodySchema,
} from "@/server/schemas/clips.schema";
import { deleteClip, getClip, updateClip } from "@/server/services/clips";

export const { GET, PATCH, DELETE } = createRouteHandlers({
  GET: async (_req, context) => {
    const params = parseRouteParams(context.params, clipIdParamSchema);
    const clip = await getClip(params.clipId);
    return json(clip);
  },
  PATCH: async (req, context) => {
    const userId = await requireUserId();
    const params = parseRouteParams(context.params, clipIdParamSchema);
    const body = await parseJsonBody(req, clipUpdateBodySchema);
    const clip = await updateClip(Number(userId), params.clipId, body);
    return json(clip);
  },
  DELETE: async (_req, context) => {
    const userId = await requireUserId();
    const params = parseRouteParams(context.params, clipIdParamSchema);
    await deleteClip(Number(userId), params.clipId);
    return new Response(null, { status: 204 });
  },
});
