import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export function findById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

export async function list(
  opts: {
    page?: number;
    pageSize?: number;
    includeDeleted?: boolean;
    orderBy?:
      | Prisma.UserOrderByWithRelationInput
      | Prisma.UserOrderByWithRelationInput[];
  } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where = opts.includeDeleted ? {} : { deletedAt: null };
  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: opts.orderBy ?? { createdAt: "desc" },
    }),
  ]);
  return { data, total };
}

export function create(data: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  region?: string | null;
}) {
  return prisma.user.create({ data });
}

export function update(
  id: number,
  data: { name?: string | null; image?: string | null; region?: string | null },
) {
  return prisma.user.update({ where: { id }, data });
}

export function softDelete(id: number) {
  return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function hardDelete(id: number) {
  return prisma.user.delete({ where: { id } });
}
