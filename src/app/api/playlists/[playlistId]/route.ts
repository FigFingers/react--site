// @ts-nocheck

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ playlistId: string }> },
) {
  const { playlistId } = await context.params;

  const playlist = await prisma.playlist.findUnique({
    where: { id: Number(playlistId) },
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

export async function DELETE(req, { params }) {
  const { playlistClipId } = params;

  await prisma.playlistClip.delete({
    where: { id: Number(playlistClipId) },
  });

  return Response.json({ ok: true });
}
