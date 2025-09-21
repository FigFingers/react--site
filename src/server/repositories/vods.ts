import { prisma } from "@/server/db";

export async function findById(id: number) {
  return prisma.vod.findUnique({ where: { id } });
}

export async function list(opts: { page?: number; pageSize?: number; includeDeleted?: boolean; code?: string; name?: string; orderBy?: any } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where: any = {};
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

export async function create(data: { code: string; name: string }) {
  return prisma.vod.create({ data });
}

export async function update(id: number, data: { code?: string; name?: string }) {
  return prisma.vod.update({ where: { id }, data });
}

export async function softDelete(id: number) {
  return prisma.vod.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function hardDelete(id: number) {
  return prisma.vod.delete({ where: { id } });
}

export async function listAliases(vodId: number, opts: { page?: number; pageSize?: number } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where = { vodId };
  const [total, data] = await Promise.all([
    prisma.vodAlias.count({ where }),
    prisma.vodAlias.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
  ]);
  return { data, total };
}

export async function createAlias(vodId: number, alias: string) {
  return prisma.vodAlias.create({ data: { vodId, alias } });
}

export async function updateAlias(aliasId: number, data: { alias?: string }) {
  return prisma.vodAlias.update({ where: { id: aliasId }, data });
}

export async function deleteAlias(aliasId: number) {
  return prisma.vodAlias.delete({ where: { id: aliasId } });
}

