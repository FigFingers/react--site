import { prisma } from "@/server/db";

export async function findById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

export async function list(opts: { page?: number; pageSize?: number; includeDeleted?: boolean; orderBy?: any } = {}) {
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

export async function create(data: { name?: string | null; email?: string | null; image?: string | null; region?: string | null }) {
  return prisma.user.create({ data });
}

export async function update(id: number, data: { name?: string | null; image?: string | null; region?: string | null }) {
  return prisma.user.update({ where: { id }, data });
}

export async function softDelete(id: number) {
  return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function hardDelete(id: number) {
  return prisma.user.delete({ where: { id } });
}

