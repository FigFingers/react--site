// src/server/auth/session.ts

import type { Prisma, User } from "@prisma/client";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { UnauthorizedError } from "@/server/http/errors";

export type UserId = number;

//    - API などで「外に出して良いユーザー情報」の標準形
//    - hashedPassword / deletedAt は除外
export type SafeUser = Omit<User, "hashedPassword" | "deletedAt">;

//    - 呼び出し側が select を渡すときに使う
//    - hashedPassword: true と書くとコンパイルエラーになる
type UserSafeSelect = Omit<Prisma.UserSelect, "hashedPassword"> & {
  hashedPassword?: false;
};

//    - 1リクエスト中で auth() の結果をキャッシュ
export const getSession = cache(auth);

//    引数なし  → SafeUser | null を返す（標準形）
//    select あり → select に応じた型 | null を返す
//    どちらの場合も：
//    - ログインしていなければ null
//    - ソフトデリートされているユーザー（deletedAt !== null）は null
//    - hashedPassword はクエリ上から除外される
export async function getCurrentUser(): Promise<SafeUser | null>;

export async function getCurrentUser<T extends UserSafeSelect>(
  select: T,
): Promise<Prisma.UserGetPayload<{ select: T }> | null>;

export async function getCurrentUser<T extends UserSafeSelect>(
  select?: T,
): Promise<SafeUser | Prisma.UserGetPayload<{ select: T }> | null> {
  const session = await getSession();
  const userId = parseSessionUserId(session?.user?.id);
  if (userId == null) return null;

  // ソフトデリート対応: deletedAt が null のユーザーだけを許可
  if (select) {
    // 呼び出し側で select 渡してきたパターン
    // → hashedPassword は UserSafeSelect のおかげで true にできない
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select,
    });
  } else {
    // デフォルト: SafeUser を返すパターン
    // → omit で hashedPassword / deletedAt だけ除外し、それ以外は全部返す
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      omit: {
        hashedPassword: true,
        deletedAt: true,
      },
    });

    // user は User から上記フィールドだけ除いた形になっている想定
    return user as SafeUser | null;
  }
}

//    - 未ログイン or ソフトデリート済みなら UnauthorizedError を投げる
//    - getCurrentUser と同様に：
//      引数なし → SafeUser を返す
//      select あり → select に応じた型を返す
export async function requireUser(): Promise<SafeUser>;

export async function requireUser<T extends UserSafeSelect>(
  select: T,
): Promise<Prisma.UserGetPayload<{ select: T }>>;

export async function requireUser<T extends UserSafeSelect>(
  select?: T,
): Promise<SafeUser | Prisma.UserGetPayload<{ select: T }>> {
  const user = await getCurrentUser(select as T);
  if (!user) throw new UnauthorizedError();
  return user;
}

//    単にuser.idのみが欲しい場合
export async function requireUserId(): Promise<UserId> {
  const { id } = await requireUser({ id: true });
  const userId = parseSessionUserId(id);
  if (userId == null) throw new UnauthorizedError();
  return userId;
}

//    - パスワード比較/変更など、hashedPassword が本当に必要なとき専用
//    - 普通の API からは使わない
//    - ソフトデリート済みユーザーは除外
export function getUserWithPassword(userId: UserId) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      hashedPassword: true,
    },
  });
}

function parseSessionUserId(value: unknown): UserId | null {
  if (typeof value === "bigint") {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
  }

  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
}
