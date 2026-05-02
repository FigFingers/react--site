import "./globals.css";
import Sidebar from "@/app/base/_components/sidebar/sidebar";
import HeadSearch from "@/app/base/_components/headSearch/headSearch";
import { SessionProvider } from "@/providers/session-provider";
import { auth } from "@/auth"; // サーバー側のauth関数
import { ExtensionLinker } from "@/components/ExtensionLinker";
import React from "react";

export const metadata = { title: "My App", description: "…" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // サーバーでセッションを取得
  const session = await auth();

  return (
    <html lang="ja">
      <body>
        {/* ここでセッションを初期値として渡す */}
        <SessionProvider session={session}>
          {session?.user && <ExtensionLinker />}
          <div className="app-shell">
            <aside className="sidebar"><Sidebar /></aside>
            <div className="main-column">
              <header className="header"><HeadSearch /></header>
              <main className="main-content">{children}</main>
            </div>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
