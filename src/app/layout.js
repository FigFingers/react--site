// src/app/layout.js
import "./globals.css";
import Sidebar from "@/app/base/_components/sidebar/sidebar";
import HeadSearch from "@/app/base/_components/headSearch/headSearch";

export const metadata = { title: "My App", description: "…" };

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <div className="app-shell">
          <aside className="sidebar"><Sidebar /></aside>
          <div className="main-column">
            <header className="header"><HeadSearch /></header>
            <main className="main-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

