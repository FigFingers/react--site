// @ts-nocheck

// src/app/api/playlists/all/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CHUNK_SIZE = 100;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : null;

  try {
    // --------------------------------------------------
    // Prisma で cursor-based pagination
    // --------------------------------------------------
    const playlists = await prisma.playlist.findMany({
      take: CHUNK_SIZE + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: { updatedAt: "desc" },
      include: {
        user: true, // user.name を得るため
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
          take: 3, // 軽量用の代表3件（元仕様を保持）
        },
      },
    });

    // --------------------------------------------------
    // nextCursor 判定
    // --------------------------------------------------
    let nextCursor: number | null = null;
    if (playlists.length > CHUNK_SIZE) {
      const extra = playlists.pop()!;
      nextCursor = extra.id;
    }

    // --------------------------------------------------
    // PlayListCluster.tsx が期待する形式にマッピング
    // --------------------------------------------------
    const items = playlists.map((p) => ({
      id: p.id,
      name: p.name, // PlayListItem に必須
      user_name: p.user?.name ?? "unknown",
      data: String(p.id), // /playlists/[id] へ遷移
      preview_clips: p.clips?.map((c) => c.clip) ?? [], // 任意: UIでサムネ用途
    }));

    return NextResponse.json({
      items,
      nextCursor,
    });
  } catch (e) {
    console.error("playlist all error:", e);
    return NextResponse.json(
      { error: "Failed to fetch playlist data" },
      { status: 500 },
    );
  }
}
