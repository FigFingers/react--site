import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { UnauthorizedError } from "@/server/http/errors";

export async function getSession() {
  return auth();
}

export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user && (session.user as any).id;
  if (!id) return null;
  const userId = typeof id === "string" ? parseInt(id, 10) : id;
  if (!Number.isFinite(userId)) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

