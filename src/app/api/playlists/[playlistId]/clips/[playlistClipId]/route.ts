// 認可・エラー仕様:
//   401 - 未ログイン
//   400 - playlistId / playlistClipId が正の整数でない
//   403 - playlist が存在しない、または所有者が自分でない
//   404 - playlistClip が URL の playlistId に属していない、またはすでに削除済み

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ playlistId: string; playlistClipId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const { playlistId: playlistIdStr, playlistClipId: playlistClipIdStr } =
    await context.params;

  const playlistIdNum = Number(playlistIdStr);
  const playlistClipIdNum = Number(playlistClipIdStr);
  if (
    !Number.isInteger(playlistIdNum) ||
    playlistIdNum <= 0 ||
    !Number.isInteger(playlistClipIdNum) ||
    playlistClipIdNum <= 0
  ) {
    return new Response("Bad Request", { status: 400 });
  }

  // owner check: playlist の所有者が自分であることを先に確認
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistIdNum },
    select: { userId: true },
  });
  if (!playlist || playlist.userId !== userId) {
    return new Response("Forbidden", { status: 403 });
  }

  // deleteMany で playlistId + id の両方が一致するものだけ削除（競合時の 500 を防止）
  const { count } = await prisma.playlistClip.deleteMany({
    where: {
      id: playlistClipIdNum,
      playlistId: playlistIdNum,
    },
  });

  // count === 0 は「存在しない」または「別プレイリストのもの」
  // owner check 済みなので forbidden ではなく 404 を返す
  if (count === 0) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(null, { status: 200 });
}
