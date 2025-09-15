import { prisma } from '@/lib/prisma';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("q") || "";
  const user = searchParams.get("user") || "";

  try {
    // 完全一致検索
    const exactMatch = await prisma.clip.findMany({
      where: {
        title: keyword,
        ...(user && { user }),
      },
      orderBy: { id: 'desc' },
    });

    // 部分一致検索（ただし完全一致を除外）
    const partialMatches = await prisma.clip.findMany({
      where: {
        title: {
          contains: keyword
        },
        ...(user && { user }),
        NOT: {
          title: keyword,
        },
      },
    });

    // 類似度（タイトル長の差）でソート
    const sortedPartial = partialMatches.sort((a, b) => {
      const dist = (t) => Math.abs(t.title.length - keyword.length);
      return dist(a) - dist(b);
    });

    const results = [...exactMatch, ...sortedPartial].slice(0, 30);

    return new Response(JSON.stringify({ allReceivedData: results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("検索エラー:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "検索に失敗しました" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
