import { prisma } from '@/lib/prisma';

/**
 * GET /api/clips/randomByTitle?q=BEASTARS&user=yabuki
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const keyword = searchParams.get('q') || '';
  const user    = searchParams.get('user') || '';

  if (!keyword) {
    return new Response(
      JSON.stringify({ error: 'q パラメータ（タイトルキーワード）が必要です' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // ─── フィルタ条件作成 ─────────────────────
    const where = {
      title: { contains: keyword },   // 部分一致
      ...(user && { user })           // user 指定があれば追加
    };

    // ─── 条件に合う全件を取得 ─────────────────
    const allMatches = await prisma.clip.findMany({ where });

    // ─── データが無い場合 ─────────────────────
    if (allMatches.length === 0) {
      return new Response(JSON.stringify({ allReceivedData: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ─── シャッフルして先頭5件を取得 ───────────
    const randomFive = allMatches
      .sort(() => Math.random() - 0.5)   // 簡易シャッフル
      .slice(0, 5);                      // 5件だけ残す

    return new Response(JSON.stringify({ allReceivedData: randomFive }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('randomByTitle API エラー:', error);
    return new Response(JSON.stringify({ error: 'サーバーエラー' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/* ─── CORS プリフライト対応 ───────────────── */
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
