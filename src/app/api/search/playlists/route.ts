import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const keyword: string = searchParams.get("q") ?? "";
  const userId: string = searchParams.get("user") ?? "";

  try {
    // 完全一致（playlist.name）
    const exactMatch = await prisma.playlist.findMany({
      where: {
        name: keyword,
        ...(userId && { userId }),
      },
      orderBy: { id: "desc" },
      include: {
        clips: true,        // 必要なら付ける
      },
    });

    // 部分一致（完全一致除外）
    const partialMatches = await prisma.playlist.findMany({
      where: {
        name: {
          contains: keyword,
        },
        ...(userId && { userId }),
        NOT: {
          name: keyword,
        },
      },
      include: {
        clips: true,
        user: true,
      },
    });

    // 類似度（タイトル長の差）でソート
    const sortedPartial = partialMatches.sort((a, b) => {
      const dist = (t: { name: string }) =>
        Math.abs(t.name.length - keyword.length);
      return dist(a) - dist(b);
    });

    const results = [...exactMatch, ...sortedPartial].slice(0, 30);

    return new Response(JSON.stringify({ playlists: results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error(
      "検索エラー:",
      error instanceof Error ? error.message : String(error)
    );

    return new Response(JSON.stringify({ error: "検索に失敗しました" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
