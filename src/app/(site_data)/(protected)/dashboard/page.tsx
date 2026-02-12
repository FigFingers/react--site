import { signIn, signOut } from "@/auth";
import { getCurrentUser, getSession } from "@/server/auth/session";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [session, currentUser] = await Promise.all([
    getSession(),
    getCurrentUser(),
  ]);

  if (!session?.user || !currentUser) {
    return (
      <main className="main-content">
        <section className="user-info">
          <h3>ダッシュボード</h3>
          <p>ログインするとアカウント情報を表示できます。</p>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button className="change-button" type="submit">
              Googleでログイン
            </button>
          </form>
        </section>
      </main>
    );
  }

  const [accounts, sessions] = await Promise.all([
    prisma.account.findMany({
      where: { userId: currentUser.id },
      orderBy: { id: "asc" },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        type: true,
        scope: true,
        expiresAt: true,
      },
    }),
    prisma.session.findMany({
      where: { userId: currentUser.id },
      orderBy: { expires: "desc" },
      select: {
        id: true,
        expires: true,
      },
    }),
  ]);

  return (
    <main className="main-content">
      <div className="user-info">
        <h3>ユーザー情報</h3>
        <table>
          <tbody>
            <tr>
              <td>ユーザーID</td>
              <td>{currentUser.id}</td>
            </tr>
            <tr>
              <td>ニックネーム</td>
              <td>{currentUser.name ?? "(未設定)"}</td>
            </tr>
            <tr>
              <td>メールアドレス</td>
              <td>{currentUser.email ?? "(未設定)"}</td>
            </tr>
            <tr>
              <td>地域</td>
              <td>{currentUser.region ?? "(未設定)"}</td>
            </tr>
            <tr>
              <td>接続プロバイダ数</td>
              <td>{accounts.length}</td>
            </tr>
            <tr>
              <td>有効セッション数</td>
              <td>{sessions.length}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="settings">
        <h3>接続情報（概要）</h3>
        <table>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td>外部アカウント</td>
                <td>未接続</td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.provider}</td>
                  <td>{account.providerAccountId}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button className="change-button" type="submit">
            ログアウト
          </button>
        </form>
      </div>
    </main>
  );
}
