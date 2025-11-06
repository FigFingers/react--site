// src/app/api/playlists/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlists = await prisma.playlist.findMany({
    where: { userId: session.user.id }, // ✅ 自分だけ
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      user: {
        select: { name: true },
      },
      clips: {
        select: {
          clip: {
            select: {
              title: true,
              service: true,
              user: true,
            }
          }
        },
        take: 1,
      }
    }
  });

  const formatted = {
    allReceivedData: playlists.map((p) => ({
      my_list_name: p.name,
      user_name: p.user?.name ?? "Unknown User",
      icon: p.clips[0]?.clip.service ?? "unknown",
      data: p.id,
    }))
  };

  return NextResponse.json(formatted);
}
