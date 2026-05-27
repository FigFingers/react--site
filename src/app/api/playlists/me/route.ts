// @ts-nocheck

// src/app/api/playlists/me/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { name: true } },
        clips: {
          select: {
            clip: {
              select: {
                title: true,
                service: true,
                user: true,
              },
            },
          },
          take: 1, // preview 用の 1件
        },
      },
    });

    // -----------------------------------------
    // PlayListCluster の item 型に統一
    // -----------------------------------------
    const items = playlists.map((p) => ({
      id: p.id,
      name: p.name, // ← UI が期待
      user_name: p.user?.name ?? "Unknown",
      data: String(p.id), // /playlists/[id] 遷移用
      icon: p.clips[0]?.clip.service ?? "unknown",
    }));

    // pagination 不要なので nextCursor は null
    return NextResponse.json({
      items,
      nextCursor: null,
    });
  } catch (e) {
    console.error("playlist me error:", e);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 },
    );
  }
}
