import { prisma } from '@/lib/prisma';

export async function GET() {
  const results = await prisma.clip.findMany({
    select: { service: true },
    distinct: ['service'],
    orderBy: { service: 'asc' },
  });

  return Response.json({ services: results.map((r) => r.service) });
}
