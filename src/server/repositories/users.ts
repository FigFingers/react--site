import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export function findById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

export async function list(
  opts: {
    skip?: number;
    take?: number;
    includeDeleted?: boolean;
    orderBy?:
      | Prisma.UserOrderByWithRelationInput
      | Prisma.UserOrderByWithRelationInput[];
  } = {},
) {
  const skip = opts.skip ?? 0;
  const take = opts.take ?? 20;
  const where = opts.includeDeleted ? {} : { deletedAt: null };
  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take,
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

export async function listUserVods(
  userId: number,
  opts: { skip?: number; take?: number } = {},
) {
  const skip = opts.skip ?? 0;
  const take = opts.take ?? 20;
  const where: Prisma.UserVodWhereInput = {
    userId,
    vod: { deletedAt: null },
  };
  const [total, records] = await Promise.all([
    prisma.userVod.count({ where }),
    prisma.userVod.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { vod: true },
    }),
  ]);
  return { data: records.map((record) => record.vod), total };
}

type ActiveInsertResult = {
  active_exists: boolean;
  inserted: boolean;
};

export async function addUserVodIfVodActive(userId: number, vodId: number) {
  const rows = await prisma.$queryRaw<ActiveInsertResult[]>`
    WITH active AS (
      SELECT v.id
      FROM vods v
      WHERE v.id = ${vodId} AND v.deleted_at IS NULL
    ),
    inserted AS (
      INSERT INTO users_vods (user_id, vod_id)
      SELECT ${userId}, ${vodId}
      FROM active
      ON CONFLICT (user_id, vod_id) DO NOTHING
      RETURNING 1
    )
    SELECT
      EXISTS (SELECT 1 FROM active) AS active_exists,
      EXISTS (SELECT 1 FROM inserted) AS inserted
  `;

  return rows[0] ?? { active_exists: false, inserted: false };
}

export async function removeUserVod(userId: number, vodId: number) {
  const result = await prisma.userVod.deleteMany({ where: { userId, vodId } });
  return result.count;
}
