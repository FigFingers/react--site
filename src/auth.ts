import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/server/db";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
const isCrossSiteAuth =
  process.env.NODE_ENV === "production" || authUrl.startsWith("https://");
const sessionCookieName = isCrossSiteAuth
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";
const sessionCookieSameSite = isCrossSiteAuth ? "none" : "lax";

if (!googleClientId || !googleClientSecret) {
  throw new Error(
    "Google OAuth credentials (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) are not set",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: sessionCookieSameSite,
        path: "/",
        secure: isCrossSiteAuth,
      },
    },
  },

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
    async jwt({ token, user }) {
      if (user && user.id != null) {
        token.uid = String(user.id);
      }

      if (token.uid == null && token.email) {
        const dbUser = await prisma.user.findFirst({
          where: {
            email: token.email,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (!dbUser) {
          throw new Error("User not found for token.email");
        }

        token.uid = String(dbUser.id);
      }
      return token;
    },

    session({ session, token }) {
      if (!session.user) return session;

      if (token.uid == null) {
        throw new Error("token.uid is missing in session callback");
      }

      session.user.id = token.uid;
      return session;
    },
  },
});
