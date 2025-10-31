// src/app/api/playlists/[playlistId]/reorder/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ playlistId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const { playlistId } = await context.params;
  const playlistIdNum = Number(playlistId);

  // ✅ プレイリスト所有者チェック
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistIdNum },
    select: { userId: true },
  });

  if (!playlist || playlist.userId !== userId) {
    return new Response("Forbidden", { status: 403 });
  }

  // 並び順データ
  const updates = await req.json(); // [{ id, order }, ...]

  await prisma.$transaction(
    updates.map((u: { id: number; order: number }) =>
      prisma.playlistClip.update({
        where: { id: u.id },
        data: { order: u.order },
      })
    )
  );

  return new Response("OK", { status: 200 });
}
