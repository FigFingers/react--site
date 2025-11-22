import { z } from "zod";

import {
  hardDeleteQuerySchema,
  idSchema,
  includeDeletedQuerySchema,
  nonEmptyBody,
  paginationQuerySchema,
  sortQuerySchema,
} from "@/server/schemas/common";

export const clipListQuerySchema = paginationQuerySchema
  .merge(includeDeletedQuerySchema)
  .merge(sortQuerySchema.partial())
  .extend({
    userId: idSchema.optional(),
    vodId: idSchema.optional(),
    title: z.string().optional(),
  });

export const clipCreateBodySchema = z
  .object({
    vodId: idSchema,
    name: z.string().max(255),
    title: z.string().min(1),
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    url: z.string().url(),
    epnum: z.string().nullable().optional(),
  })
  .strict();

export const clipUpdateBodySchema = nonEmptyBody(
  z
    .object({
      name: z.string().max(255).optional(),
      title: z.string().min(1).optional(),
      startMs: z.number().int().min(0).optional(),
      endMs: z.number().int().min(0).optional(),
      url: z.string().url().optional(),
      epnum: z.string().nullable().optional(),
    })
    .strict(),
);

export const clipIdParamSchema = z.object({ clipId: idSchema });

export const clipDeleteQuerySchema = hardDeleteQuerySchema;

export type ClipListQuery = z.infer<typeof clipListQuerySchema>;
export type ClipCreateBody = z.infer<typeof clipCreateBodySchema>;
export type ClipUpdateBody = z.infer<typeof clipUpdateBodySchema>;
export type ClipIdParam = z.infer<typeof clipIdParamSchema>;
export type ClipDeleteQuery = z.infer<typeof clipDeleteQuerySchema>;
