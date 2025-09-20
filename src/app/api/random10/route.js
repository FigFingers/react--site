import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // DBから最大200件を取得してランダムに20件選出（全体の件数に応じて調整可）
    const allClips = await prisma.clip.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' }, // 任意（ここはランダム性に関係しない）
    });

    // シャッフルして20件選出
    const random20 = allClips
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
    console.error('ランダム20件APIエラー:', error);
    return new Response(JSON.stringify({ error: 'サーバーエラー' }), {
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
