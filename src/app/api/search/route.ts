import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const CHUNK_SIZE = 100;

export async function GET(req: NextRequest): Promise<Response> {
  
  const { searchParams } = new URL(req.url);

  const keyword = searchParams.get("q") ?? "";
  const user = searchParams.get("user") ?? "";
  const cursorParam = searchParams.get("cursor");

  // cursor は number 型
  const cursor = cursorParam ? Number(cursorParam) : null;

  console.log("cursorParam:", cursorParam);
  console.log("parsed cursor:", cursor);

  try {
    // ================
    // where 条件
    // ================
    const whereClause: any = {
      title: {
        contains: keyword,
      },
      ...(user && { user }),
    };

    // ================
    // cursor ページング検索
    // ================
    const items = await prisma.clip.findMany({
      take: CHUNK_SIZE + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      where: whereClause,
      orderBy: { id: "desc" }, // 安定順序
    });

    // nextCursor 判定
    let nextCursor: number | null = null;

    if (items.length > CHUNK_SIZE) {
      const extra = items.pop(); // 次page用
      nextCursor = extra!.id;
    }

    // =====================
    // relevance（軽いスコア調整）
    // =====================
    const scored = items.sort((a, b) => {
      const dist = (t: { title: string }) =>
        Math.abs(t.title.length - keyword.length);
      return dist(a) - dist(b);
    });

    return new Response(
      JSON.stringify({
        items: scored,   // clipCluster と完全互換
        nextCursor,      // search も続きが読める
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
