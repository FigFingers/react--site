import { z } from "zod";

import { paginationQuerySchema } from "@/server/schemas/common";

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z
    .string()
    .min(1, "Query is required")
    .max(255)
    .transform((value) => value.trim()),
  type: z.enum(["all", "clips", "playlists", "vods"]).optional().default("all"),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
