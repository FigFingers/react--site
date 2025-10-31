import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  const playlistId = Number(params.playlistId);
  const updates = await req.json();

  await prisma.$transaction(
    updates.map((item) =>
      prisma.playlistClip.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    )
  );

  return NextResponse.json({ success: true });
}
