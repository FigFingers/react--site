// src/auth.ts
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma"; // エイリアス未設定なら "../lib/prisma" に変更

// セッションに user.id を露出（UI側で扱いやすく）
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" }, // DBセッション：User/Accountと同期が自然
  trustHost: true,

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // 検証時に同意画面を出したい場合（不要なら削ってOK）
      authorization: {
        params: {
          prompt: "consent select_account",
          include_granted_scopes: "false",
          access_type: "offline",
          // hl: "ja",
        },
      },
      // scope: "openid email profile" // 既定で十分
    }),
  ],

  // DBセッション時は user がDBのUser行。ここで id を session に出すだけ。
  callbacks: {
    async session({ session, user }) {
      if (session.user) (session.user as any).id = user.id;
      return session;
    },
  },
});
