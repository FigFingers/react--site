import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const clips = await prisma.clip.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return new Response(JSON.stringify({ allReceivedData: clips }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('DB取得エラー:', error);
    return new Response(JSON.stringify({ error: 'サーバーエラー' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


// CORS対策（必要であれば）
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