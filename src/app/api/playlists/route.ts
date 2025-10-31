// src/app/api/playlists/route.ts
// src/app/api/playlists/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth"; // ← v5 ではこれだけでOK

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlists = await prisma.playlist.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(playlists);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();

  const playlist = await prisma.playlist.create({
    data: {
      name,
      userId: session.user.id, // ✅ 外部から userId を受け取らない
    },
  });

  return NextResponse.json(playlist);
}
