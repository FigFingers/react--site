import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUserDisplayName } from "@/lib/users/displayName";

const CHUNK_SIZE = 100;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : null;

  try {
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
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
          },
        },
        clips: {
          select: {
            clip: {
              select: {
                title: true,
                service: true,
                user: true,
                owner: {
                  select: {
                    id: true,
                    name: true,
                    nickname: true,
                    email: true,
                  },
                },
              },
            },
          },
          take: 3,
        },
      },
    });

    let nextCursor: number | null = null;
    if (playlists.length > CHUNK_SIZE) {
      const extra = playlists.pop()!;
      nextCursor = extra.id;
    }

    const items = playlists.map((p) => ({
      id: p.id,
      name: p.name,
      user_name: resolveCurrentUserDisplayName(p.user),
      data: String(p.id),
      preview_clips:
        p.clips?.map(({ clip }) => {
          const { owner, ...clipData } = clip;
          return {
            ...clipData,
            user: owner ? resolveCurrentUserDisplayName(owner) : clip.user,
          };
        }) ?? [],
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
