import { prisma } from '@/lib/prisma';

export async function POST(req) {
  try {
    const body = await req.json();
    const { platform, currentClipId, userId } = body;

    if (!platform) {
      return new Response(JSON.stringify({ error: 'platformが指定されていません' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 指定されたplatformと一致するClipを最大200件取得
    const candidates = await prisma.clip.findMany({
      where: { service: platform },
      take: 200,
    });

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ error: '候補が見つかりませんでした' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ランダムに1件選出
    const randomClip = candidates[Math.floor(Math.random() * candidates.length)];

    return new Response(JSON.stringify(randomClip), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('次のClip取得エラー:', err);
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