import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export function findById(id: number) {
  return prisma.clip.findUnique({ where: { id } });
}

export async function list(
  opts: {
    skip?: number;
    take?: number;
    includeDeleted?: boolean;
    userId?: number;
    vodId?: number;
    title?: string;
    orderBy?:
      | Prisma.ClipOrderByWithRelationInput
      | Prisma.ClipOrderByWithRelationInput[];
  } = {},
) {
  const skip = opts.skip ?? 0;
  const take = opts.take ?? 20;
  const where: Prisma.ClipWhereInput = {};
  if (!opts.includeDeleted) where.deletedAt = null;
  if (opts.userId != null) where.userId = opts.userId;
  if (opts.vodId != null) where.vodId = opts.vodId;
  if (opts.title && opts.title.trim() !== "")
    where.title = { contains: opts.title.trim(), mode: "insensitive" };
  const [total, data] = await Promise.all([
    prisma.clip.count({ where }),
    prisma.clip.findMany({
      where,
      skip,
      take,
      orderBy: opts.orderBy ?? { createdAt: "desc" },
    }),
  ]);
  return { data, total };
}

export function create(data: {
  userId: number;
  vodId: number;
  name: string;
  title: string;
  startMs: number;
  endMs: number;
  url: string;
  epnum?: string | null;
}) {
  return prisma.clip.create({ data });
}

export function update(
  id: number,
  data: {
    name?: string;
    title?: string;
    startMs?: number;
    endMs?: number;
    url?: string;
    epnum?: string | null;
  },
) {
  return prisma.clip.update({ where: { id }, data });
}

export function softDelete(id: number) {
  return prisma.clip.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function hardDelete(id: number) {
  return prisma.clip.delete({ where: { id } });
}

export function incrementViews(id: number, by: bigint = 1n) {
  return prisma.clip.update({
    where: { id },
    data: { views: { increment: by } },
  });
}
