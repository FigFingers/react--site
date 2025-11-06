import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ playlistId: string }> }
) {
  const { playlistId } = await context.params;

  // 対象プレイリスト内の clip 情報を順番付きで取得
  const playlist = await prisma.playlist.findUnique({
    where: { id: Number(playlistId) },
    include: {
      clips: {
        orderBy: { order: "asc" },
        include: {
          clip: true,
        },
      },
    },
  });

  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  // clip 情報を整形して返す
  const clips = playlist.clips.map((pc) => ({
    id: pc.clip.id,
    clipname: pc.clip.clipName,
    title: pc.clip.title,
    service: pc.clip.service,
    Subtitles: pc.clip.epnumber,
    url: pc.clip.url,
    startTime: pc.clip.startTime,
    endTime: pc.clip.endTime,
    order: pc.order,
  }));

  return NextResponse.json({ playlistId, name: playlist.name, clips });
}
