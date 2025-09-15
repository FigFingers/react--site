import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.Vod.createMany({
    data: [
      { code: 'NETFLIX',     name: 'Netflix' },
      { code: 'PRIME_VIDEO', name: 'Prime Video' },
      { code: 'DISNEY_PLUS', name: 'Disney+' },
    ],
    skipDuplicates: true, // すでに登録されていたら無視
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
