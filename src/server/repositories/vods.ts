import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export function findById(id: number) {
  return prisma.vod.findUnique({ where: { id } });
}

export async function list(
  opts: {
    page?: number;
    pageSize?: number;
    includeDeleted?: boolean;
    code?: string;
    name?: string;
    orderBy?:
      | Prisma.VodOrderByWithRelationInput
      | Prisma.VodOrderByWithRelationInput[];
  } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where: Prisma.VodWhereInput = {};
  if (!opts.includeDeleted) where.deletedAt = null;
  if (opts.code) where.code = { contains: opts.code, mode: "insensitive" };
  if (opts.name) where.name = { contains: opts.name, mode: "insensitive" };
  const [total, data] = await Promise.all([
    prisma.vod.count({ where }),
    prisma.vod.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: opts.orderBy ?? { createdAt: "desc" },
    }),
  ]);
  return { data, total };
}

export function create(data: { code: string; name: string }) {
  return prisma.vod.create({ data });
}

export function update(id: number, data: { code?: string; name?: string }) {
  return prisma.vod.update({ where: { id }, data });
}

export function softDelete(id: number) {
  return prisma.vod.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function hardDelete(id: number) {
  return prisma.vod.delete({ where: { id } });
}

export async function listAliases(
  vodId: number,
  opts: { page?: number; pageSize?: number } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where = { vodId };
  const [total, data] = await Promise.all([
    prisma.vodAlias.count({ where }),
    prisma.vodAlias.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { data, total };
}

export function createAlias(vodId: number, alias: string) {
  return prisma.vodAlias.create({ data: { vodId, alias } });
}

export function updateAlias(aliasId: number, data: { alias?: string }) {
  return prisma.vodAlias.update({ where: { id: aliasId }, data });
}

export function deleteAlias(aliasId: number) {
  return prisma.vodAlias.delete({ where: { id: aliasId } });
}
