import { prisma } from "@/server/db";

export async function listFavoriteClips(
  userId: number,
  opts: { skip?: number; take?: number } = {},
) {
  const skip = opts.skip ?? 0;
  const take = opts.take ?? 20;
  const where = {
    userId,
    clip: { deletedAt: null },
  };
  const [total, rels] = await Promise.all([
    prisma.favoriteClip.count({ where }),
    prisma.favoriteClip.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { clip: true },
    }),
  ]);
  return { data: rels.map((r) => r.clip), total };
}

type ActiveInsertResult = {
  active_exists: boolean;
  inserted: boolean;
};

export async function addFavoriteClipIfClipActive(
  userId: number,
  clipId: number,
) {
  const rows = await prisma.$queryRaw<ActiveInsertResult[]>`
    WITH active AS (
      SELECT c.id
      FROM clips c
      WHERE c.id = ${clipId} AND c.deleted_at IS NULL
    ),
    inserted AS (
      INSERT INTO favorite_clips (user_id, clip_id)
      SELECT ${userId}, ${clipId}
      FROM active
      ON CONFLICT (user_id, clip_id) DO NOTHING
      RETURNING 1
    )
    SELECT
      EXISTS (SELECT 1 FROM active) AS active_exists,
      EXISTS (SELECT 1 FROM inserted) AS inserted
  `;

  return rows[0] ?? { active_exists: false, inserted: false };
}

export function removeFavoriteClip(userId: number, clipId: number) {
  return prisma.favoriteClip.deleteMany({
    where: { userId, clipId },
  });
}

export async function listFavoritePlaylists(
  userId: number,
  opts: { skip?: number; take?: number } = {},
) {
  const skip = opts.skip ?? 0;
  const take = opts.take ?? 20;
  const where = {
    userId,
    playlist: { deletedAt: null },
  };
  const [total, rels] = await Promise.all([
    prisma.favoritePlaylist.count({ where }),
    prisma.favoritePlaylist.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { playlist: true },
    }),
  ]);
  return { data: rels.map((r) => r.playlist), total };
}

export async function addFavoritePlaylistIfActive(
  userId: number,
  playlistId: number,
) {
  const rows = await prisma.$queryRaw<ActiveInsertResult[]>`
    WITH active AS (
      SELECT p.id
      FROM playlists p
      WHERE p.id = ${playlistId} AND p.deleted_at IS NULL
    ),
    inserted AS (
      INSERT INTO favorite_playlists (user_id, playlist_id)
      SELECT ${userId}, ${playlistId}
      FROM active
      ON CONFLICT (user_id, playlist_id) DO NOTHING
      RETURNING 1
    )
    SELECT
      EXISTS (SELECT 1 FROM active) AS active_exists,
      EXISTS (SELECT 1 FROM inserted) AS inserted
  `;

  return rows[0] ?? { active_exists: false, inserted: false };
}

export function removeFavoritePlaylist(userId: number, playlistId: number) {
  return prisma.favoritePlaylist.deleteMany({
    where: { userId, playlistId },
  });
}
