import { z } from "zod";

import {
  hardDeleteQuerySchema,
  idSchema,
  includeDeletedQuerySchema,
  nonEmptyBody,
  optionalString,
  paginationQuerySchema,
  sortQuerySchema,
} from "@/server/schemas/common";

export const userListQuerySchema = paginationQuerySchema
  .extend(includeDeletedQuerySchema.shape)
  .extend(sortQuerySchema.partial().shape);

export const userCreateBodySchema = z
  .object({
    name: optionalString(255),
    email: z.email().optional(),
    image: z.url().max(2048).optional(),
    region: optionalString(255),
  })
  .strict();

export const userUpdateBodySchema = nonEmptyBody(
  z
    .object({
      name: z.string().max(255).nullable().optional(),
      image: z.url().max(2048).nullable().optional(),
      region: z.string().max(255).nullable().optional(),
    })
    .strict(),
);

export const userIdParamSchema = z.object({ id: idSchema });

export const userVodBodySchema = z.object({ vodId: idSchema });

export const userDeleteQuerySchema = hardDeleteQuerySchema;

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UserCreateBody = z.infer<typeof userCreateBodySchema>;
export type UserUpdateBody = z.infer<typeof userUpdateBodySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type UserDeleteQuery = z.infer<typeof userDeleteQuerySchema>;
