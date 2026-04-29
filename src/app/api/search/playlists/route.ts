import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUserDisplayName } from "@/lib/users/displayName";
import { parseKeywords, scoreFields, MAX_QUERY_LENGTH } from "@/lib/search/utils";

const CHUNK_SIZE = 100;

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);

  const raw = searchParams.get("q") ?? "";
  const userId = searchParams.get("user") ?? "";
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : null;

  if (raw.length > MAX_QUERY_LENGTH) {
    return new Response(JSON.stringify({ error: "Query too long" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const keywords = parseKeywords(raw);

  // 各キーワードが name / owner の name / owner の nickname のいずれかにマッチすること (AND)
  const keywordConditions = keywords.map((kw) => ({
    OR: [
      { name:             { contains: kw } },
      { user: { name:     { contains: kw } } },
      { user: { nickname: { contains: kw } } },
    ],
  }));

  const whereClause = {
    ...(keywordConditions.length > 0 && { AND: keywordConditions }),
    ...(userId && { userId }),
  };

  try {
    const playlists = await prisma.playlist.findMany({
      take: CHUNK_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, nickname: true, email: true },
        },
      },
      orderBy: { id: "desc" },
    });

    let nextCursor: number | null = null;
    if (playlists.length > CHUNK_SIZE) {
      const extra = playlists.pop()!;
      nextCursor = extra.id;
    }

    const items = playlists
      .map((p) => ({
        id: p.id,
        name: p.name,
        user_name: resolveCurrentUserDisplayName(p.user),
        data: String(p.id),
        _score: scoreFields([p.name, p.user.name, p.user.nickname], keywords),
      }))
      .sort((a, b) => b._score - a._score || b.id - a.id)
      .map(({ _score, ...item }) => item);

    return new Response(
      JSON.stringify({ items, nextCursor }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("検索エラー:", error);
    return new Response(
      JSON.stringify({ error: "検索に失敗しました" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
