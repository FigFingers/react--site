import { createRouteHandlers } from "@/server/api/handler";

export const { GET } = createRouteHandlers({
  GET: async () => Response.json({ status: "ok" }),
});
