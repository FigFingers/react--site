// src/app/(site_data)/(protected)/dashboard/page.tsx
import React from 'react';
import Image from "next/image";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // キャッシュ無効（常に最新）

// マスクユーティリティ（トークンなどの秘匿値）
function mask(value: unknown, visible = 4) {
  if (typeof value !== "string" || value.length <= visible) return value ?? null;
  return `${value.slice(0, visible)}••••••••`;
}

export default async function MePage() {
  const session = await auth();

  // 未ログインなら Sign in ボタンだけ表示（サーバーアクション）
  if (!session?.user) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold mb-4">ユーザー情報</h1>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button className="rounded-lg border px-4 py-2">Sign in with Google</button>
        </form>
      </main>
    );
  }

  // DB から該当ユーザー行と関連を取得（Account/Session）
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: true,
      sessions: true,
    },
  });

  // “安全に表示できる形”へ変換（アクセストークン等はマスク）
  const safeDump = dbUser && {
    ...dbUser,
    accounts: dbUser.accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      providerAccountId: a.providerAccountId,
      type: a.type,
      scope: a.scope,
      expires_at: a.expires_at,
      token_type: a.token_type,
      // 秘匿系はマスク
      access_token: mask(a.access_token),
      refresh_token: mask(a.refresh_token),
      id_token: mask(a.id_token),
      session_state: mask(a.session_state),
    })),
    sessions: dbUser.sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      expires: s.expires,
      // セッショントークンは念のためマスク
      sessionToken: mask(s.sessionToken),
    })),
  };

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ユーザー情報（開発用ビュー）</h1>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button className="rounded-lg border px-3 py-1.5">Sign out</button>
        </form>
      </header>

      {/* 基本プロフィール */}
      <section className="flex items-center gap-4">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "User"}
            width={56}
            height={56}
            className="rounded-full"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-gray-300 grid place-items-center">
            {(session.user.name ?? "U").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <div className="text-lg font-medium">{session.user.name ?? "(no name)"}</div>
          <div className="text-sm text-gray-600">{session.user.email ?? "(no email)"}</div>
          <div className="text-xs text-gray-500">User ID: {session.user.id}</div>
        </div>
      </section>

      {/* セッション（NextAuthの見えている値） */}
      <section>
        <h2 className="font-semibold mb-2">Session（フロントへ渡る値）</h2>
        <pre className="rounded-lg border p-3 overflow-x-auto text-sm">
{JSON.stringify(session, null, 2)}
        </pre>
      </section>

      {/* DB側（Prisma経由） */}
      <section>
        <h2 className="font-semibold mb-2">Database（User / Account / Session）</h2>
        <pre className="rounded-lg border p-3 overflow-x-auto text-sm">
{JSON.stringify(safeDump, null, 2)}
        </pre>
        <p className="mt-2 text-xs text-gray-500">
          ※ アクセストークン等の秘匿値は表示用にマスクしています。
        </p>
      </section>
    </main>
  );
}
