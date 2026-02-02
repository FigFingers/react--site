// src/auth.ts
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
  }
}

// 推測: HTTPS で運用する本番環境では secure を有効化し、開発時は無効化する。
const isProd =
  process.env.NODE_ENV === "production" ||
  (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

const sessionCookieName = isProd
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // ✅ 拡張機能から Cookie で API を叩くため JWT に統一
  session: { strategy: "jwt" },

  trustHost: true,

  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: isProd,
      },
    },
  },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
        },
      },
    }),
  ],

  callbacks: {
    // ✅ JWT へ DB user.id を流す
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },

    // ✅ Session に user.id を流す（UI / API 両方が使いやすい）
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
