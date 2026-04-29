// 認可・エラー仕様:
//   401 - 未ログイン
//   400 - playlistId / clipId が正の整数でない、または JSON パース失敗
//   403 - playlist が存在しない、または所有者が自分でない
//   404 - clip が存在しない
//   409 - 同じ playlistId + clipId がすでに存在する（重複追加）
//   clip.userId は問わない（Clip は公開データ）

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { playlistId: playlistIdStr } = await params;
  const playlistIdNum = Number(playlistIdStr);
  if (!Number.isInteger(playlistIdNum) || playlistIdNum <= 0) {
    return Response.json({ error: "Invalid playlistId" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rawClipId =
    typeof body === "object" && body !== null && "clipId" in body
      ? (body as { clipId: unknown }).clipId
      : undefined;
  const clipIdNum = Number(rawClipId);
  if (!Number.isInteger(clipIdNum) || clipIdNum <= 0) {
    return Response.json({ error: "Invalid clipId" }, { status: 400 });
  }

  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistIdNum },
    select: { userId: true },
  });
  if (!playlist || playlist.userId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const clip = await prisma.clip.findUnique({
    where: { id: clipIdNum },
    select: { id: true },
  });
  if (!clip) {
    return Response.json({ error: "Clip not found" }, { status: 404 });
  }

  // 重複チェック（API 側チェック。DB 制約がない場合の二重追加防止）
  const existing = await prisma.playlistClip.findFirst({
    where: { playlistId: playlistIdNum, clipId: clipIdNum },
    select: { id: true },
  });
  if (existing) {
    return Response.json({ error: "Already exists" }, { status: 409 });
  }

  const added = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.playlistClip
      .aggregate({
        where: { playlistId: playlistIdNum },
        _max: { order: true },
      })
      .then((res) => (res._max.order ?? -1) + 1);

    return tx.playlistClip.create({
      data: {
        playlistId: playlistIdNum,
        clipId: clipIdNum,
        order: newOrder,
      },
    });
  });

  return Response.json({ ok: true, added });
}
