import { prisma } from "@/server/db";

export async function findById(id: number) {
  return prisma.playlist.findUnique({ where: { id } });
}

export async function list(opts: { page?: number; pageSize?: number; includeDeleted?: boolean; userId?: number; name?: string; orderBy?: any } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where: any = {};
  if (!opts.includeDeleted) where.deletedAt = null;
  if (opts.userId) where.userId = opts.userId;
  if (opts.name) where.name = { contains: opts.name, mode: "insensitive" };
  const [total, data] = await Promise.all([
    prisma.playlist.count({ where }),
    prisma.playlist.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: opts.orderBy ?? { createdAt: "desc" } }),
  ]);
  return { data, total };
}

export async function create(data: { userId: number; name: string }) {
  return prisma.playlist.create({ data });
}

export async function update(id: number, data: { name?: string }) {
  return prisma.playlist.update({ where: { id }, data });
}

export async function softDelete(id: number) {
  return prisma.playlist.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function hardDelete(id: number) {
  return prisma.playlist.delete({ where: { id } });
}

export async function addClip(playlistId: number, clipId: number) {
  return prisma.clipPlaylist.create({ data: { playlistId, clipId } });
}

export async function removeClip(playlistId: number, clipId: number) {
  return prisma.clipPlaylist.delete({ where: { clipId_playlistId: { clipId, playlistId } } });
}

export async function listClips(playlistId: number, opts: { page?: number; pageSize?: number } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where = { playlistId };
  const [total, rels] = await Promise.all([
    prisma.clipPlaylist.count({ where }),
    prisma.clipPlaylist.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" }, include: { clip: true } }),
  ]);
  return { data: rels.map((r) => r.clip), total };
}

export async function addVod(playlistId: number, vodId: number) {
  return prisma.playlistVod.create({ data: { playlistId, vodId } });
}

export async function removeVod(playlistId: number, vodId: number) {
  return prisma.playlistVod.delete({ where: { playlistId_vodId: { playlistId, vodId } } });
}

export async function listVods(playlistId: number, opts: { page?: number; pageSize?: number } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where = { playlistId };
  const [total, rels] = await Promise.all([
    prisma.playlistVod.count({ where }),
    prisma.playlistVod.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" }, include: { vod: true } }),
  ]);
  return { data: rels.map((r) => r.vod), total };
}

