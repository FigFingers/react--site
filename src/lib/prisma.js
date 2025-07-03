import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// すでに globalThis に prisma があればそれを使う
// なければ new PrismaClient() してそれを使う
export const prisma =
  globalForPrisma.prisma || new PrismaClient();

// 開発中のみ globalThis に保持（ホットリロード対応）
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}


