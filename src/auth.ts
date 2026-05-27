import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
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

const baseAdapter = PrismaAdapter(prisma);
const toUserId = (id: string) => {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
};

const adapter: Adapter = {
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
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
      allowDangerousEmailAccountLinking: true,
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
