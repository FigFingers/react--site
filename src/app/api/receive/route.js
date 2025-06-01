const { prisma } = require('@/lib/prisma');

export async function POST(req) {
  const data = await req.json();

  const result = await prisma.clip.create({
    data: {
      user: data.user,
      service: data.service,
      startTime: data.StartTime,
      endTime: data.EndTime,
      url: data.URL,
      title: data.title,
      epnumber: data.epnumber,
    },
  });

  return new Response(JSON.stringify({ message: '保存完了', result }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
