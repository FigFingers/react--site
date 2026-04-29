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

  // 各キーワードが title / clipName / epnumber / service のいずれかにマッチすること (AND)
  const keywordConditions = keywords.map((kw) => ({
    OR: [
      { title:    { contains: kw } },
      { clipName: { contains: kw } },
      { epnumber: { contains: kw } },
      { service:  { contains: kw } },
    ],
  }));

  const whereClause = {
    ...(keywordConditions.length > 0 && { AND: keywordConditions }),
    ...(userId && { userId }),
  };

  try {
    const items = await prisma.clip.findMany({
      take: CHUNK_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: whereClause,
      orderBy: { id: "desc" },
      include: {
        owner: {
          select: { id: true, name: true, nickname: true, email: true },
        },
      },
    });

    let nextCursor: number | null = null;
    if (items.length > CHUNK_SIZE) {
      const extra = items.pop();
      nextCursor = extra!.id;
    }

    const scored = items
      .map(({ owner, ...clip }) => ({
        ...clip,
        user: owner ? resolveCurrentUserDisplayName(owner) : clip.user,
        _score: scoreFields([clip.title, clip.clipName, clip.epnumber, clip.service], keywords),
      }))
      .sort((a, b) => b._score - a._score || b.id - a.id)
      .map(({ _score, ...clip }) => clip);

    return new Response(
      JSON.stringify({ items: scored, nextCursor }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("search API error:", error);
    return new Response(JSON.stringify({ error: "Search failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
