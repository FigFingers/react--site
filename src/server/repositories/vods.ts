import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { type CursorPayload, encodeCursor } from "@/server/http/pagination";

export function findById(id: number) {
  return prisma.vod.findFirst({ where: { id, deletedAt: null } });
}

export async function list(
  opts: {
    skip?: number;
    take?: number;
    includeDeleted?: boolean;
    code?: string;
    name?: string;
    orderBy?:
      | Prisma.VodOrderByWithRelationInput
      | Prisma.VodOrderByWithRelationInput[];
  } = {},
) {
  const skip = opts.skip ?? 0;
  const take = opts.take ?? 20;
  const where: Prisma.VodWhereInput = {};
  if (!opts.includeDeleted) where.deletedAt = null;
  if (opts.code) where.code = { contains: opts.code, mode: "insensitive" };
  if (opts.name) where.name = { contains: opts.name, mode: "insensitive" };
  const [total, data] = await Promise.all([
    prisma.vod.count({ where }),
    prisma.vod.findMany({
      where,
      skip,
      take,
      orderBy: opts.orderBy ?? { createdAt: "desc" },
    }),
  ]);
  return { data, total };
}

export async function listCursor(
  opts: {
    cursor?: CursorPayload | null;
    limit?: number;
    includeDeleted?: boolean;
    code?: string;
    name?: string;
  } = {},
) {
  const limit = opts.limit ?? 20;
  const cursorDate = opts.cursor ? new Date(opts.cursor.c) : null;
  const cursorId = opts.cursor ? Number.parseInt(opts.cursor.i, 10) : undefined;
  const where: Prisma.VodWhereInput = {};

  if (!opts.includeDeleted) where.deletedAt = null;
  if (opts.code) where.code = { contains: opts.code, mode: "insensitive" };
  if (opts.name) where.name = { contains: opts.name, mode: "insensitive" };
  if (cursorDate && cursorId != null && Number.isFinite(cursorId)) {
    where.OR = [
      { createdAt: { lt: cursorDate } },
      {
        AND: [{ createdAt: cursorDate }, { id: { lt: cursorId } }],
      },
    ];
  }

  const data = await prisma.vod.findMany({
    where,
    take: limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const hasNext = data.length > limit;
  const page = hasNext ? data.slice(0, limit) : data;
  const last = page.at(-1);

  return {
    data: page,
    hasNext,
    nextCursor: last ? encodeCursor(last.createdAt, last.id) : null,
  };
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
  opts: { skip?: number; take?: number } = {},
) {
  const skip = opts.skip ?? 0;
  const take = opts.take ?? 20;
  const where = { vodId };
  const [total, data] = await Promise.all([
    prisma.vodAlias.count({ where }),
    prisma.vodAlias.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { data, total };
}

export async function listAliasesCursor(
  vodId: number,
  opts: { cursor?: CursorPayload | null; limit?: number } = {},
) {
  const limit = opts.limit ?? 20;
  const cursorDate = opts.cursor ? new Date(opts.cursor.c) : null;
  const cursorId = opts.cursor ? Number.parseInt(opts.cursor.i, 10) : undefined;
  const where: Prisma.VodAliasWhereInput = { vodId };

  if (cursorDate && cursorId != null && Number.isFinite(cursorId)) {
    where.OR = [
      { createdAt: { lt: cursorDate } },
      {
        AND: [{ createdAt: cursorDate }, { id: { lt: cursorId } }],
      },
    ];
  }

  const data = await prisma.vodAlias.findMany({
    where,
    take: limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const hasNext = data.length > limit;
  const page = hasNext ? data.slice(0, limit) : data;
  const last = page.at(-1);

  return {
    data: page,
    hasNext,
    nextCursor: last ? encodeCursor(last.createdAt, last.id) : null,
  };
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
