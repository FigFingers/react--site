// src/auth.ts (NextAuth v5, JWT session, PrismaAdapter)
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";

// Session に user.id を追加（数値想定）
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: number };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  // 明示しなくても ENV の AUTH_SECRET/NEXTAUTH_SECRET を読むが、指定してもOK
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent select_account",
          access_type: "offline",
        },
      },
    }),
  ],

  callbacks: {
    // JWT にユーザーIDを格納
    async jwt({ token, user }) {
      if (user) {
        // NextAuthのuser.idは number | string になり得るため数値化
        const id = typeof user.id === "string" ? parseInt(user.id, 10) : (user.id as number);
        (token as any).uid = id;
      }
      return token;
    },
    // Session に id を反映
    async session({ session, token }) {
      if (session.user) {
        const id = (token as any).uid;
        (session.user as any).id = typeof id === "string" ? parseInt(id, 10) : (id as number);
      }
      return session;
    },
  },
});
