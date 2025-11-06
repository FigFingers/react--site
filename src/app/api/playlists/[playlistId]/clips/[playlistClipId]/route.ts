import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ playlistId: string; playlistClipId: string }> }
) {
  const { playlistId, playlistClipId } = await context.params;

  await prisma.playlistClip.delete({
    where: { id: Number(playlistClipId) },
  });

  return new Response(null, { status: 200 });
}
