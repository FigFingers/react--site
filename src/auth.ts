// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
// import { PrismaAdapter } from "@auth/prisma-adapter"; // 使う場合
// import { prisma } from "@/lib/prisma";                 // 使う場合

export const { handlers, auth, signIn, signOut } = NextAuth({
  // adapter: PrismaAdapter(prisma), // 必要なら
  session: { strategy: "jwt" },      // 例：JWTセッション
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          // ★ 毎回、同意＆アカウント選択を促す
          prompt: "consent select_account",
          // ★ refresh_token発行（必要時）
          access_type: "offline",
          // ★ 過去の同意スコープに便乗しない
          include_granted_scopes: "false",
          // 任意：UI言語固定
          // hl: "ja",
        },
      },
      // 必要最小限から始めるのが実務的
      // scope: "openid email profile",
    }),
  ],

  // --- refresh_token を扱う場合の典型コールバック ---
  callbacks: {
    async jwt({ token, account }) {
      // 初回ログイン時：アクセストークン等を取り込む
      if (account?.provider === "google") {
        // Googleのレスポンスには下記が入ることがある
        // account.access_token, account.refresh_token, account.expires_at
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;  // ここが重要（1回きりのことも）
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : null; // ms
      }

      // 有効期限を過ぎていたら更新（実装例）
      const needsRefresh =
        token.expiresAt && typeof token.expiresAt === "number"
          ? Date.now() > token.expiresAt - 60_000 // 60秒前に余裕を持って
          : false;

      if (needsRefresh && token.refreshToken) {
        try {
          // Googleのトークンエンドポイントで更新
          const body = new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID!,
            client_secret: process.env.AUTH_GOOGLE_SECRET!,
            grant_type: "refresh_token",
            refresh_token: String(token.refreshToken),
          });

          const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          });

          if (!res.ok) throw new Error("Failed to refresh token");

          const data = (await res.json()) as {
            access_token: string;
            expires_in: number; // 秒
            refresh_token?: string;
          };

          token.accessToken = data.access_token;
          token.expiresAt = Date.now() + data.expires_in * 1000;

          // 稀に新しいrefresh_tokenが返る仕様もあるため、上書きは慎重に
          if (data.refresh_token) {
            token.refreshToken = data.refresh_token;
          }
        } catch {
          // 失敗したらセッション無効化の方針 or そのまま期限切れで再ログイン誘導
          delete token.accessToken;
          delete token.refreshToken;
          delete token.expiresAt;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // クライアントで使いたいアクセストークンを露出（必要な範囲で）
      if (token?.accessToken) {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
});
