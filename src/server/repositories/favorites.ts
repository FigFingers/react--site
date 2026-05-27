import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { type CursorPayload, encodeCursor } from "@/server/http/pagination";

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

export async function listFavoriteClipsCursor(
  userId: number,
  opts: { cursor?: CursorPayload | null; limit?: number } = {},
) {
  const limit = opts.limit ?? 20;
  const cursorDate = opts.cursor ? new Date(opts.cursor.c) : null;
  const cursorClipId = opts.cursor
    ? Number.parseInt(opts.cursor.i, 10)
    : undefined;
  const where: Prisma.FavoriteClipWhereInput = {
    userId,
    clip: { deletedAt: null },
  };

  if (cursorDate && cursorClipId != null && Number.isFinite(cursorClipId)) {
    where.OR = [
      { createdAt: { lt: cursorDate } },
      { AND: [{ createdAt: cursorDate }, { clipId: { lt: cursorClipId } }] },
    ];
  }

  const rels = await prisma.favoriteClip.findMany({
    where,
    take: limit + 1,
    orderBy: [{ createdAt: "desc" }, { clipId: "desc" }],
    include: { clip: true },
  });

  const hasNext = rels.length > limit;
  const page = hasNext ? rels.slice(0, limit) : rels;
  const last = page.at(-1);

  return {
    data: page.map(
      (record) =>
        (record as Prisma.FavoriteClipGetPayload<{ include: { clip: true } }>)
          .clip,
    ),
    hasNext,
    nextCursor: last ? encodeCursor(last.createdAt, last.clipId) : null,
  };
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

export async function listFavoritePlaylistsCursor(
  userId: number,
  opts: { cursor?: CursorPayload | null; limit?: number } = {},
) {
  const limit = opts.limit ?? 20;
  const cursorDate = opts.cursor ? new Date(opts.cursor.c) : null;
  const cursorPlaylistId = opts.cursor
    ? Number.parseInt(opts.cursor.i, 10)
    : undefined;
  const where: Prisma.FavoritePlaylistWhereInput = {
    userId,
    playlist: { deletedAt: null },
  };

  if (
    cursorDate &&
    cursorPlaylistId != null &&
    Number.isFinite(cursorPlaylistId)
  ) {
    where.OR = [
      { createdAt: { lt: cursorDate } },
      {
        AND: [
          { createdAt: cursorDate },
          { playlistId: { lt: cursorPlaylistId } },
        ],
      },
    ];
  }

  const rels = await prisma.favoritePlaylist.findMany({
    where,
    take: limit + 1,
    orderBy: [{ createdAt: "desc" }, { playlistId: "desc" }],
    include: { playlist: true },
  });

  const hasNext = rels.length > limit;
  const page = hasNext ? rels.slice(0, limit) : rels;
  const last = page.at(-1);

  return {
    data: page.map(
      (record) =>
        (
          record as Prisma.FavoritePlaylistGetPayload<{
            include: { playlist: true };
          }>
        ).playlist,
    ),
    hasNext,
    nextCursor: last ? encodeCursor(last.createdAt, last.playlistId) : null,
  };
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
