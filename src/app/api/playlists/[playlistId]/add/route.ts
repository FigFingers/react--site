import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { playlistId: string } }
) {
  const { clipId } = await req.json();
  const playlistId = Number(params.playlistId);

  // プレイリスト内の既存クリップ数を取得 → order = 次の番号にする
  const count = await prisma.playlistClip.count({
    where: { playlistId },
  });

  const added = await prisma.playlistClip.create({
    data: {
      playlistId,
      clipId,
      order: count, // ← これを渡せば解決
    },
  });

  return NextResponse.json(added);
}
