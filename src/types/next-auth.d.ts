// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

// 🔹 Session 拡張
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
  }
}

// 🔹 JWT 拡張
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    uid?: string;
  }
}
