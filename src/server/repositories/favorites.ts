import { prisma } from "@/server/db";

export async function listFavoriteClips(
  userId: number,
  opts: { page?: number; pageSize?: number } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where = { userId };
  const [total, rels] = await Promise.all([
    prisma.favoriteClip.count({ where }),
    prisma.favoriteClip.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { clip: true },
    }),
  ]);
  return { data: rels.map((r) => r.clip), total };
}

export function addFavoriteClip(userId: number, clipId: number) {
  return prisma.favoriteClip.create({ data: { userId, clipId } });
}

export function removeFavoriteClip(userId: number, clipId: number) {
  return prisma.favoriteClip.delete({
    where: { userId_clipId: { userId, clipId } },
  });
}

export async function listFavoritePlaylists(
  userId: number,
  opts: { page?: number; pageSize?: number } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where = { userId };
  const [total, rels] = await Promise.all([
    prisma.favoritePlaylist.count({ where }),
    prisma.favoritePlaylist.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { playlist: true },
    }),
  ]);
  return { data: rels.map((r) => r.playlist), total };
}

export function addFavoritePlaylist(userId: number, playlistId: number) {
  return prisma.favoritePlaylist.create({ data: { userId, playlistId } });
}

export function removeFavoritePlaylist(userId: number, playlistId: number) {
  return prisma.favoritePlaylist.delete({
    where: { userId_playlistId: { userId, playlistId } },
  });
}
