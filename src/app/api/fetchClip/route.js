import { prisma } from '@/lib/prisma'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * プリフライトリクエスト対応（CORS）
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

/**
 * クエリによるクリップ取得
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') || '', 10)

  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    })
  }

  const clip = await prisma.clip.findUnique({ where: { id } })

  if (!clip) {
    return new Response(JSON.stringify({ error: 'Clip not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    })
  }

  return new Response(JSON.stringify(clip), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  })
}
