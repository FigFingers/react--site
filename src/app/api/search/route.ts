import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUserDisplayName } from "@/lib/users/displayName";

const CHUNK_SIZE = 100;

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);

  const keyword = searchParams.get("q") ?? "";
  const userId = searchParams.get("user") ?? "";
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : null;

  try {
    const whereClause = {
      title: {
        contains: keyword,
      },
      ...(userId && { userId }),
    };

    const items = await prisma.clip.findMany({
      take: CHUNK_SIZE + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      where: whereClause,
      orderBy: { id: "desc" },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
          },
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
      }))
      .sort((a, b) => {
        const dist = (t: { title: string }) =>
          Math.abs(t.title.length - keyword.length);
        return dist(a) - dist(b);
      });

    return new Response(
      JSON.stringify({
        items: scored,
        nextCursor,
      }),
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
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
