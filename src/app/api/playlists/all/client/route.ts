// src/app/api/playlists/all/client/route.ts
// DRYに違反してそうなので消すかもしれませんが、一応残しておきます。
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const playlists = await prisma.playlist.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      user: {                      // ✅ userId ではなく user を JOIN
        select: { name: true },   // ✅ 名前だけ取得
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
      user_name: p.user?.name ?? "Unknown User",   // ✅ JOIN したユーザー名
      icon: p.clips[0]?.clip.service ?? "unknown",
      data: p.id, // go ボタンで使う playlist ID
    }))
  };

  return NextResponse.json(formatted);
}

