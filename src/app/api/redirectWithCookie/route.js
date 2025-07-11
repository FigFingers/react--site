import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request, { params }) {
  const id = parseInt(params.id)
  if (!id) {
    return new Response("Invalid ID", { status: 400 })
  }

  const clip = await prisma.clip.findUnique({ where: { id } })
  if (!clip) {
    return new Response("Clip not found", { status: 404 })
  }

  // クッキーを設定（サーバーサイド対応）
  const cookieStore = cookies()
  cookieStore.set('name', '切り抜き')
  cookieStore.set('title', clip.title || '')
  cookieStore.set('username', clip.user || '')
  cookieStore.set('starttime', String(clip.startTime))
  cookieStore.set('endtime', String(clip.endTime))
  cookieStore.set('url', clip.url || '')

  // リダイレクト先 URL を構築
  const base = clip.service === 'Netflix'
    ? 'https://www.netflix.com'
    : clip.service === 'Prime'
    ? 'https://www.amazon.co.jp/primevideo'
    : ''
  const redirectUrl = `${base}${clip.url}?t=${clip.startTime}`

  redirect(redirectUrl)
}
