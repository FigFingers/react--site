import { z } from "zod";

import {
  hardDeleteQuerySchema,
  idSchema,
  includeDeletedQuerySchema,
  nonEmptyBody,
  paginationQuerySchema,
  sortQuerySchema,
} from "@/server/schemas/common";

export const playlistListQuerySchema = paginationQuerySchema
  .merge(includeDeletedQuerySchema)
  .merge(sortQuerySchema.partial())
  .extend({
    userId: idSchema.optional(),
    name: z.string().optional(),
  });

export const playlistCreateBodySchema = z
  .object({ name: z.string().max(255) })
  .strict();

export const playlistUpdateBodySchema = nonEmptyBody(
  z
    .object({
      name: z.string().max(255).optional(),
    })
    .strict(),
);

export const playlistIdParamSchema = z.object({ playlistId: idSchema });

export const playlistClipBodySchema = z.object({ clipId: idSchema });
export const playlistVodBodySchema = z.object({ vodId: idSchema });

export const playlistClipParamSchema = playlistIdParamSchema.extend({
  clipId: idSchema,
});
export const playlistVodParamSchema = playlistIdParamSchema.extend({
  vodId: idSchema,
});

export const playlistChildrenQuerySchema = paginationQuerySchema;

export const playlistDeleteQuerySchema = hardDeleteQuerySchema;

export type PlaylistListQuery = z.infer<typeof playlistListQuerySchema>;
export type PlaylistCreateBody = z.infer<typeof playlistCreateBodySchema>;
export type PlaylistUpdateBody = z.infer<typeof playlistUpdateBodySchema>;
export type PlaylistIdParam = z.infer<typeof playlistIdParamSchema>;
export type PlaylistClipBody = z.infer<typeof playlistClipBodySchema>;
export type PlaylistVodBody = z.infer<typeof playlistVodBodySchema>;
export type PlaylistClipParam = z.infer<typeof playlistClipParamSchema>;
export type PlaylistVodParam = z.infer<typeof playlistVodParamSchema>;
export type PlaylistChildrenQuery = z.infer<typeof playlistChildrenQuerySchema>;
export type PlaylistDeleteQuery = z.infer<typeof playlistDeleteQuerySchema>;
