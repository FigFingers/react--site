// この API は DB 書込み処理を行うため、静的キャッシュを使ってはいけない。
// Next.js に「毎回サーバーで実行する動的ルートである」と明示。
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  // ✅ params は「同期」ではなく「Promise」として受け取る必要がある
  { params }: { params: Promise<{ playlistId: string }> }
) {
  // ✅ Next.js が要求している正しい使い方：
  // `params` 自体を await してから、プロパティにアクセスする
  const { playlistId } = await params;

  // POST body から clipId を取得
  const { clipId } = await req.json();

  // ✅ DB トランザクション内で order を安全に決定
  const added = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.playlistClip.aggregate({
      where: { playlistId: Number(playlistId) },
      _max: { order: true },
    }).then(res => (res._max.order ?? -1) + 1); // order が無い場合は 0 から

    return tx.playlistClip.create({
      data: {
        playlistId: Number(playlistId),
        clipId: Number(clipId),
        order: newOrder,
      },
    });
  });

  return Response.json({ ok: true, added });
}



