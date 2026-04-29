import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveCurrentUserDisplayName } from '@/lib/users/displayName'

export async function GET(request, context) {
  const idParam = context?.params?.id
  const id = parseInt(idParam || '', 10)

  if (isNaN(id)) {
    return new Response('Invalid ID', { status: 400 })
  }

  const clip = await prisma.clip.findUnique({
    where: { id },
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
  })
  if (!clip) {
    return new Response('Clip not found', { status: 404 })
  }

  let redirectUrl = clip.url
  if (clip.service === 'Netflix') {
    redirectUrl = `https://www.netflix.com${clip.url}?t=${Math.floor(clip.startTime)}`
  }

  const response = NextResponse.redirect(redirectUrl)

  response.cookies.set('name', '切り抜き', { path: '/', maxAge: 3600 })
  response.cookies.set('title', clip.title || '', { path: '/', maxAge: 3600 })
  response.cookies.set('username', clip.owner ? resolveCurrentUserDisplayName(clip.owner) : clip.user || '', { path: '/', maxAge: 3600 })
  response.cookies.set('starttime', String(clip.startTime), { path: '/', maxAge: 3600 })
  response.cookies.set('endtime', String(clip.endTime), { path: '/', maxAge: 3600 })
  response.cookies.set('url', clip.url || '', { path: '/', maxAge: 3600 })

  return response
}
