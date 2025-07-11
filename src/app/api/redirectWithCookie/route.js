import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id'));

  if (!id) return new Response('Invalid ID', { status: 400 });

  const clip = await prisma.clip.findUnique({ where: { id } });
  if (!clip) return new Response('Not Found', { status: 404 });

  const cookieStore = await cookies();
  cookieStore.set('name', '切り抜き');
  cookieStore.set('title', clip.title || '');
  cookieStore.set('username', clip.user || '');
  cookieStore.set('starttime', String(clip.startTime));
  cookieStore.set('endtime', String(clip.endTime));
  cookieStore.set('url', clip.url || '');

  // サービス別のURL構築
  let redirectUrl = '';
  if (clip.service === 'Netflix') {
    redirectUrl = `https://www.netflix.com${clip.url}?t=${Math.floor(clip.startTime)}`;
  } else {
    // 他サービス用のフォールバック（ここは任意で）
    redirectUrl = clip.url.startsWith('http')
      ? `${clip.url}?t=${Math.floor(clip.startTime)}`
      : `https://example.com${clip.url}?t=${Math.floor(clip.startTime)}`;
  }

  return NextResponse.redirect(redirectUrl);
}
