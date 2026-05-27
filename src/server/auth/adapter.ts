import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";

import { prisma } from "@/server/db";

const baseAdapter = PrismaAdapter(prisma);

function toUserId(id: string) {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export const authAdapter: Adapter = {
  ...baseAdapter,
  async getUser(id) {
    const userId = toUserId(id);
    if (userId == null) return null;

    return prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    }) as Promise<AdapterUser | null>;
  },
  async getUserByEmail(email) {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    }) as Promise<AdapterUser | null>;
  },
  async updateUser({ id, ...data }) {
    const userId = toUserId(id);
    if (userId == null) {
      throw new Error(`Invalid adapter user id: ${id}`);
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        emailVerified: data.emailVerified,
        image: data.image,
      },
    }) as unknown as Promise<AdapterUser>;
  },
  async linkAccount(data) {
    const account = data as AdapterAccount & {
      access_token?: string;
      expires_at?: number;
      id_token?: string;
      refresh_token?: string;
      session_state?: string;
      token_type?: string;
    };

    return prisma.account.create({
      data: {
        userId: BigInt(account.userId),
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: account.refresh_token,
        accessToken: account.access_token,
        expiresAt: account.expires_at,
        tokenType: account.token_type,
        scope: account.scope,
        idToken: account.id_token,
        sessionState: account.session_state,
      },
    }) as unknown as AdapterAccount;
  },
};
