import { createRouteHandlers } from "@/server/api/handler";
import { requireUser } from "@/server/auth/session";
import { json } from "@/server/http/json";

export const { GET } = createRouteHandlers({
  GET: async () => {
    const user = await requireUser();
    return json(user);
  },
});
