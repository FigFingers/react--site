// src/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { issueUniqueHandle, normalizeNickname } from "@/lib/user-ids";
import type { Prisma } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" }, // どちらでも可。DBに寄せるならこちら
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent select_account",
          include_granted_scopes: "false",
          access_type: "offline",
        },
      },
      // scope: "openid email profile" // 既定でOK
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // ここで email（Gmail含む）を確実に保持
      // Googleのprofile.emailは“Gmailとは限らない”点に注意（独自ドメインもある）
      return true;
    },
  },
  events: {
  async signIn({ user, profile }) {
    const email = (profile as any)?.email ?? user.email ?? undefined;
    const name  = (profile as any)?.name  ?? user.name  ?? undefined;

    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    if (existing?.handle) return;

    const seed   = (email?.split("@")[0] || name || "user").toString();
    const handle = await issueUniqueHandle(seed);

    // ★ ここを安全な型取りに置き換え
    const data: Prisma.UserUpdateArgs["data"] = { handle };

    if (!existing?.nickname && name) {
      data.nickname     = name;
      data.nicknameNorm = normalizeNickname(name);
    }
    if (!existing?.email && email) {
      (data as any).email = email; // email は nullable 設計ならそのまま代入でOK
    }

    try {
      await prisma.user.update({ where: { id: user.id }, data });
    } catch (e: any) {
      if (e.code === "P2002" && e.meta?.target?.includes("handle")) {
        const fallback = await issueUniqueHandle(`user-${user.id.slice(0, 4)}`);
        await prisma.user.update({ where: { id: user.id }, data: { handle: fallback } });
      } else {
        throw e;
      }
    }
  },
},
});
