import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(
  req: Request,
  { params }: { params: { playlistId: string } }
) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: Number(params.playlistId) },
    include: {
      clips: {
        orderBy: { order: "asc" },
        include: { clip: true },
      },
    },
  });

  if (!playlist)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(playlist);
}
