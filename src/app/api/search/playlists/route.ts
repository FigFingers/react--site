import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const keyword: string = searchParams.get("q") ?? "";
  const userId: string = searchParams.get("user") ?? "";

  try {
    const playlists = await prisma.playlist.findMany({
      where: {
        name: {
          contains: keyword,
        },
        ...(userId && { userId }),
      },
      include: {
        user: true,
      },
      orderBy: {
        id: "desc",
      }
    });

    // UI が期待している形式に変換する
    const allReceivedData = playlists.map((p) => ({
      my_list_name: p.name,
      user_name: p.user?.name ?? "unknown",
      data: p.id,
    }));

    return new Response(JSON.stringify({ allReceivedData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (error) {
    console.error("検索エラー:", error);
    return new Response(JSON.stringify({ error: "検索に失敗しました" }), {
      status: 500,
    });
  }
}
