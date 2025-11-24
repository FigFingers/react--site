import { createRouteHandlers } from "@/server/api/handler";
import { requireUser } from "@/server/auth/session";

export const { GET } = createRouteHandlers({
  GET: async () => {
    const user = await requireUser();
    return Response.json(user);
  },
});
