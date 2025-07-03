import { prisma } from '@/lib/prisma';

/**
 * POST /api/receive
 * 動画クリップ情報の保存
 */
export async function POST(req) {
  try {
    const data = await req.json();

    const result = await prisma.clip.create({
      data: {
        user:      data.user,
        service:   data.service,
        startTime: data.StartTime,
        endTime:   data.EndTime,
        url:       data.URL,
        title:     data.title,
        epnumber:  data.epnumber,
      },
    });

    return new Response(JSON.stringify({ message: '保存完了', result }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (error) {
    console.error('POST /api/receive エラー:', error);
    return new Response(JSON.stringify({ message: '保存失敗', error: error.message }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

/**
 * OPTIONS /api/receive
 * プリフライトリクエストへの対応
 */
export function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders({
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }),
  });
}

/**
 * CORSヘッダー共通設定
 */
function corsHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    // 'Access-Control-Allow-Credentials': 'true', // 必要なら
    ...extra,
  };
}
