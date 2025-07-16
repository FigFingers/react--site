import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') || '', 10)

  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const clip = await prisma.clip.findUnique({ where: { id } })

  if (!clip) {
    return new Response(JSON.stringify({ error: 'Clip not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(clip), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
