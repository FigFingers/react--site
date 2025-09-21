import { prisma } from "@/server/db";

export async function findById(id: number) {
  return prisma.clip.findUnique({ where: { id } });
}

export async function list(opts: { page?: number; pageSize?: number; includeDeleted?: boolean; userId?: number; vodId?: number; title?: string; orderBy?: any } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where: any = {};
  if (!opts.includeDeleted) where.deletedAt = null;
  if (opts.userId) where.userId = opts.userId;
  if (opts.vodId) where.vodId = opts.vodId;
  if (opts.title) where.title = { contains: opts.title, mode: "insensitive" };
  const [total, data] = await Promise.all([
    prisma.clip.count({ where }),
    prisma.clip.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: opts.orderBy ?? { createdAt: "desc" } }),
  ]);
  return { data, total };
}

export async function create(data: { userId: number; vodId: number; name: string; title: string; startMs: number; endMs: number; url: string; epnum?: string | null }) {
  return prisma.clip.create({ data });
}

export async function update(id: number, data: { name?: string; title?: string; startMs?: number; endMs?: number; url?: string; epnum?: string | null }) {
  return prisma.clip.update({ where: { id }, data });
}

export async function softDelete(id: number) {
  return prisma.clip.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function hardDelete(id: number) {
  return prisma.clip.delete({ where: { id } });
}

export async function incrementViews(id: number, by: bigint = 1n) {
  return prisma.clip.update({ where: { id }, data: { views: { increment: by } } });
}
