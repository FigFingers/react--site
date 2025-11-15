// src/app/api/playlists/all/route.ts
// すべてのユーザーのプレイリストを取得する API test 用
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const playlists = await prisma.playlist.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      userId: true,
      updatedAt: true,
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
        take: 3, // ← 軽量にする（代表 3件）
      }
    },
  });

  return NextResponse.json(playlists);
}
