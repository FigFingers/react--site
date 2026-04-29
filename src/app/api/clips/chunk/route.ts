import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { resolveCurrentUserDisplayName } from '@/lib/users/displayName';

const CHUNK_SIZE = 100;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursorParam = searchParams.get("cursor");

    // id は number 型なので変換
    const cursor = cursorParam ? Number(cursorParam) : null;

    const items = await prisma.clip.findMany({
      take: CHUNK_SIZE + 1,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor }, // number 型であることが重要
          }
        : {}),
      orderBy: { createdAt: 'desc' },
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
      nextCursor = extra!.id; // number 型
    }

    // シャッフル（内部順序を少しランダム化）
    const shuffled = items
      .map(({ owner, ...clip }) => ({
        ...clip,
        user: owner ? resolveCurrentUserDisplayName(owner) : clip.user,
      }))
      .sort(() => Math.random() - 0.5);

    return new Response(
      JSON.stringify({
        items: shuffled,
        nextCursor, // number
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('chunk API error:', error);
    return new Response(
      JSON.stringify({ error: 'サーバーエラー' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
