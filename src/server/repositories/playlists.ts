import type { Clip, Playlist, Prisma, Vod } from "@prisma/client";
import { prisma } from "@/server/db";
import { makePageMeta, normalizePaging } from "@/server/utils/pagination";

export function findById(id: number) {
  return prisma.playlist.findUnique({ where: { id } });
}

export async function list(
  opts: {
    page?: number;
    pageSize?: number;
    includeDeleted?: boolean;
    userId?: number;
    name?: string;
    orderBy?:
      | Prisma.PlaylistOrderByWithRelationInput
      | Prisma.PlaylistOrderByWithRelationInput[];
  } = {},
) {
  const { page, pageSize, skip, take } = normalizePaging(opts);
  const where: Prisma.PlaylistWhereInput = {};
  if (!opts.includeDeleted) where.deletedAt = null;
  if (opts.userId != null) where.userId = opts.userId;
  if (opts.name && opts.name.trim() !== "")
    where.name = { contains: opts.name.trim(), mode: "insensitive" };
  const [total, data] = await Promise.all([
    prisma.playlist.count({ where }),
    prisma.playlist.findMany({
      where,
      skip,
      take,
      orderBy: opts.orderBy ?? { createdAt: "desc" },
    }),
  ]);
  return makePageMeta<Playlist>({ data, total, page, pageSize });
}

export function create(data: { userId: number; name: string }) {
  return prisma.playlist.create({ data });
}

export function update(id: number, data: { name?: string }) {
  return prisma.playlist.update({ where: { id }, data });
}

export function softDelete(id: number) {
  return prisma.playlist.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export function hardDelete(id: number) {
  return prisma.playlist.delete({ where: { id } });
}

export function addClip(playlistId: number, clipId: number) {
  return prisma.clipPlaylist.upsert({
    where: { clipId_playlistId: { clipId, playlistId } },
    update: {},
    create: { playlistId, clipId },
  });
}

export function removeClip(playlistId: number, clipId: number) {
  return prisma.clipPlaylist.delete({
    where: { clipId_playlistId: { clipId, playlistId } },
  });
}

export async function listClips(
  playlistId: number,
  opts: { page?: number; pageSize?: number } = {},
) {
  const { page, pageSize, skip, take } = normalizePaging(opts);
  const where: Prisma.ClipPlaylistWhereInput = {
    playlistId,
    clip: { deletedAt: null },
  };
  const [total, rels] = await Promise.all([
    prisma.clipPlaylist.count({ where }),
    prisma.clipPlaylist.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { clip: true },
    }),
  ]);
  const data = rels.map((r) => r.clip) as Clip[];
  return makePageMeta<Clip>({ data, total, page, pageSize });
}

export function addVod(playlistId: number, vodId: number) {
  return prisma.playlistVod.create({ data: { playlistId, vodId } });
}

export function removeVod(playlistId: number, vodId: number) {
  return prisma.playlistVod.delete({
    where: { playlistId_vodId: { playlistId, vodId } },
  });
}

export async function listVods(
  playlistId: number,
  opts: { page?: number; pageSize?: number } = {},
) {
  const { page, pageSize, skip, take } = normalizePaging(opts);
  const where: Prisma.PlaylistVodWhereInput = {
    playlistId,
    vod: { deletedAt: null },
  };
  const [total, rels] = await Promise.all([
    prisma.playlistVod.count({ where }),
    prisma.playlistVod.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { vod: true },
    }),
  ]);
  const data = rels.map((r) => r.vod) as Vod[];
  return makePageMeta<Vod>({ data, total, page, pageSize });
}

export async function hasActiveClip(clipId: number) {
  const count = await prisma.clip.count({
    where: { id: clipId, deletedAt: null },
  });
  return count > 0;
}

export async function hasActiveVod(vodId: number) {
  const count = await prisma.vod.count({
    where: { id: vodId, deletedAt: null },
  });
  return count > 0;
}
