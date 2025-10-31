import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ playlistId: string }> }) {
  const { playlistId } = await ctx.params;
  const updates = await req.json();

  await Promise.all(
    updates.map((u: { clipId: number; order: number }) =>
      prisma.playlistClip.updateMany({
        where: { playlistId: Number(playlistId), clipId: u.clipId },
        data: { order: u.order },
      })
    )
  );

  return Response.json({ ok: true });
}


