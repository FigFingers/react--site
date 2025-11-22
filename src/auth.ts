// src/auth.ts (NextAuth v5, JWT session, PrismaAdapter)
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/server/db";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error(
    "Google OAuth credentials (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) are not set",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  // 明示しなくても ENV の AUTH_SECRET/NEXTAUTH_SECRET を読むが、指定してもOK
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: "consent select_account",
          access_type: "offline",
        },
      },
    }),
  ],

  callbacks: {
    // 🔹 JWT に必ず uid を載せる
    async jwt({ token, user }) {
      // ① 初回ログイン時（user がいるとき）は、素直に user.id を詰める
      if (user && user.id != null) {
        token.uid = String(user.id); // そのまま string
      }

      // ② それでも uid が無い場合は、email から DB を引いて補完する
      if (token.uid == null && token.email) {
        const dbUser = await prisma.user.findFirst({
          where: {
            email: token.email,
            deletedAt: null, // ← 部分ユニークの条件と揃えれば安全
          },
          select: { id: true },
        });

        if (!dbUser) {
          // ログイン済みなのにユーザーが取れないのは明らかに異常なので、ここで落として気付く
          throw new Error("User not found for token.email");
        }

        token.uid = String(dbUser.id);
      }
      return token;
    },

    // 🔹 Session に uid を反映するだけ
    session({ session, token }) {
      if (!session.user) return session;

      if (token.uid == null) {
        // jwt で必ずセットしている前提なので、入っていないのは異常
        throw new Error("token.uid is missing in session callback");
      }

      session.user.id = token.uid;
      return session;
    },
  },
});
