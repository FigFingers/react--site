import { prisma } from '@/lib/prisma';
import { resolveCurrentUserDisplayName } from '@/lib/users/displayName';

export async function GET() {
  try {
    const allClips = await prisma.clip.findMany({
      take: 200,
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

    const random20 = allClips
      .map(({ owner, ...clip }) => ({
        ...clip,
        user: owner ? resolveCurrentUserDisplayName(owner) : clip.user,
      }))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    return new Response(JSON.stringify({ allReceivedData: random20 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('random10 API error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
