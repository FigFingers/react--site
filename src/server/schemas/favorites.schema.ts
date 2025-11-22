import { z } from "zod";

import { idSchema, paginationQuerySchema } from "@/server/schemas/common";

export const favoriteListQuerySchema = paginationQuerySchema;

export const favoriteClipBodySchema = z.object({ clipId: idSchema });
export const favoritePlaylistBodySchema = z.object({ playlistId: idSchema });

export const favoriteClipParamSchema = z.object({ clipId: idSchema });
export const favoritePlaylistParamSchema = z.object({ playlistId: idSchema });

export type FavoriteListQuery = z.infer<typeof favoriteListQuerySchema>;
export type FavoriteClipBody = z.infer<typeof favoriteClipBodySchema>;
export type FavoritePlaylistBody = z.infer<typeof favoritePlaylistBodySchema>;
export type FavoriteClipParam = z.infer<typeof favoriteClipParamSchema>;
export type FavoritePlaylistParam = z.infer<typeof favoritePlaylistParamSchema>;
