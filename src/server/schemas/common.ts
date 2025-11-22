import { z } from "zod";

export const idSchema = z.coerce.number().int().min(1);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const includeDeletedQuerySchema = z.object({
  includeDeleted: z.coerce.boolean().optional().default(false),
});

export const sortQuerySchema = z.object({
  sort: z
    .string()
    .max(200)
    .regex(/^[^\n\r]*$/)
    .optional(),
});

export const hardDeleteQuerySchema = z.object({
  hard: z.coerce.boolean().optional().default(false),
});

export const paginatedQuerySchema = paginationQuerySchema.merge(
  sortQuerySchema.partial(),
);

export const nullableString = (max?: number) =>
  (max ? z.string().max(max) : z.string()).optional().nullable();

export const optionalString = (max?: number) =>
  (max ? z.string().max(max) : z.string()).optional();

export const urlString = (max?: number) =>
  max ? z.string().url().max(max) : z.string().url();

export const pageParamSchema = z.object({
  page: paginationQuerySchema.shape.page,
  pageSize: paginationQuerySchema.shape.pageSize,
});

export const favoriteQuerySchema = z.object({
  page: paginationQuerySchema.shape.page,
  pageSize: paginationQuerySchema.shape.pageSize,
});

export function nonEmptyBody<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.superRefine((data, ctx) => {
    if (Object.values(data).every((value) => typeof value === "undefined")) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided.",
      });
    }
  });
}

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type SortQuery = z.infer<typeof sortQuerySchema>;
export type HardDeleteQuery = z.infer<typeof hardDeleteQuerySchema>;
