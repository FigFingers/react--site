import { z } from "zod";

import {
  cursorPaginationQuerySchema,
  hardDeleteQuerySchema,
  idSchema,
  includeDeletedQuerySchema,
  nonEmptyBody,
  paginationQuerySchema,
  sortQuerySchema,
} from "@/server/schemas/common";

export const vodListQuerySchema = paginationQuerySchema
  .extend(includeDeletedQuerySchema.shape)
  .extend(sortQuerySchema.partial().shape)
  .extend({
    code: z.string().max(50).optional(),
    name: z.string().max(255).optional(),
  });

export const vodCursorListQuerySchema = cursorPaginationQuerySchema
  .extend({
    code: z.string().max(50).optional(),
    name: z.string().max(255).optional(),
  })
  .strict();

export const vodCreateBodySchema = z
  .object({
    code: z.string().max(50),
    name: z.string().max(255),
  })
  .strict();

export const vodUpdateBodySchema = nonEmptyBody(
  z
    .object({
      code: z.string().max(50).optional(),
      name: z.string().max(255).optional(),
    })
    .strict(),
);

export const vodIdParamSchema = z.object({ vodId: idSchema });

export const vodAliasListQuerySchema = paginationQuerySchema;
export const vodAliasCursorListQuerySchema =
  cursorPaginationQuerySchema.strict();

export const vodAliasCreateBodySchema = z
  .object({ alias: z.string().max(255) })
  .strict();

export const vodAliasUpdateBodySchema = nonEmptyBody(
  z
    .object({
      alias: z.string().max(255).optional(),
    })
    .strict(),
);

export const vodAliasParamSchema = vodIdParamSchema.extend({
  aliasId: idSchema,
});

export const vodDeleteQuerySchema = hardDeleteQuerySchema;

export type VodListQuery = z.infer<typeof vodListQuerySchema>;
export type VodCursorListQuery = z.infer<typeof vodCursorListQuerySchema>;
export type VodCreateBody = z.infer<typeof vodCreateBodySchema>;
export type VodUpdateBody = z.infer<typeof vodUpdateBodySchema>;
export type VodIdParam = z.infer<typeof vodIdParamSchema>;
export type VodAliasListQuery = z.infer<typeof vodAliasListQuerySchema>;
export type VodAliasCursorListQuery = z.infer<
  typeof vodAliasCursorListQuerySchema
>;
export type VodAliasCreateBody = z.infer<typeof vodAliasCreateBodySchema>;
export type VodAliasUpdateBody = z.infer<typeof vodAliasUpdateBodySchema>;
export type VodAliasParam = z.infer<typeof vodAliasParamSchema>;
export type VodDeleteQuery = z.infer<typeof vodDeleteQuerySchema>;
