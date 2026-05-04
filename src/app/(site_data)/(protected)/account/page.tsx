import "@/app/globals.css";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  collectSubscriptionServices,
  formatDateJa,
  formatSubscriptionLabel,
} from "./accountViewModel.mjs";
import NicknameForm from "./NicknameForm";
import { ExtensionLinkButton } from "@/components/ExtensionLinkButton";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      nickname: true,
      email: true,
      createdAt: true,
      playlists: {
        select: { id: true },
      },
    },
  });

  if (!dbUser) {
    return (
      <main className="main-content">
        <section className="user-info">
          <h3>ユーザー情報</h3>
          <p>
            ユーザー情報の取得に失敗しました。時間をおいて再読み込みしてください。
          </p>
        </section>
      </main>
    );
  }

  const subscriptionServices = collectSubscriptionServices([]);
  const displayName = dbUser.nickname ?? dbUser.name ?? "未設定";

  return (
    <main className="main-content">
      <section className="user-info">
        <h3>ユーザー情報</h3>
        <table>
          <tbody>
            <tr>
              <td>ニックネーム</td>
              <td>
                <NicknameForm
                  currentName={displayName}
                  initialNickname={dbUser.nickname ?? ""}
                />
              </td>
            </tr>
            <tr>
              <td>登録メールアドレス</td>
              <td>{dbUser.email ?? "未設定"}</td>
            </tr>
            <tr>
              <td>登録日</td>
              <td>{formatDateJa(dbUser.createdAt)}</td>
            </tr>
            <tr>
              <td>作成プレイリスト数</td>
              <td>{dbUser.playlists.length}件</td>
            </tr>
            <tr>
              <td>使用サブスクリプション</td>
              <td>{formatSubscriptionLabel(subscriptionServices)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="settings">
        <h3>設定</h3>
        <table>
          <tbody>
            <tr>
              <td>連携再生成</td>
              <td>連携再生成許可 or 終了</td>
            </tr>
            <tr>
              <td>プレイリスト再生成</td>
              <td>終了後繰り返し</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="settings">
        <h3>Chrome拡張機能</h3>
        <ExtensionLinkButton />
      </section>
    </main>
  );
}
