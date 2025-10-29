import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const playlists = await prisma.playlist.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(playlists);
}

export async function POST(req: Request) {
  const { name, userId } = await req.json();
  // userIdは暫定、後で session.user.id に置き換える
  const playlist = await prisma.playlist.create({
    data: {
      name,
      userId,
    },
  });
  return NextResponse.json(playlist);
}
