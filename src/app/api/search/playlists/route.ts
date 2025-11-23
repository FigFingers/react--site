import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const CHUNK_SIZE = 100;

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);

  const keyword = searchParams.get("q") ?? "";
  const userId = searchParams.get("user") ?? "";
  const cursorParam = searchParams.get("cursor");

  // cursor は number に確実に変換
  const cursor = cursorParam ? Number(cursorParam) : null;

  try {
    // ----------------------------------------
    // WHERE 条件
    // ----------------------------------------
    const whereClause: any = {
      name: {
        contains: keyword,
      },
      ...(userId && { userId }),
    };

    // ----------------------------------------
    // Prisma findMany with cursor pagination
    // ----------------------------------------
    const playlists = await prisma.playlist.findMany({
      take: CHUNK_SIZE + 1, // 次の cursor 判定用に +1
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      where: whereClause,
      include: {
        user: true,
      },
      orderBy: { id: "desc" },
    });

    // ----------------------------------------
    // nextCursor 判定
    // ----------------------------------------
    let nextCursor: number | null = null;

    if (playlists.length > CHUNK_SIZE) {
      const extra = playlists.pop()!;
      nextCursor = extra.id;
    }

    // ----------------------------------------
    // UI 期待形式にマッピング
    // ----------------------------------------
    const items = playlists.map((p) => ({
      id: p.id,
      name: p.name,                 // ← UI が期待する値
      user_name: p.user?.name ?? "unknown",
      data: String(p.id),           // PlayListDetailページに遷移する slug
    }));

    return new Response(
      JSON.stringify({
        items,
        nextCursor,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("検索エラー:", error);

    return new Response(
      JSON.stringify({ error: "検索に失敗しました" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
