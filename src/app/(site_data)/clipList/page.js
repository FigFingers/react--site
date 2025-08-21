// src/app/cliplist/page.js
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // SSRを強制（DB最新状態を反映）

export default async function ClipListPage() {
  const clips = await prisma.clip.findMany({
    orderBy: {
      createdAt: 'desc', // createdAtがない場合は削除してOK
    },
  });

  return (
    <main style={{ padding: '2rem' }}>
      <h1>🎬 クリップ一覧</h1>
      <ul>
        {clips.map((clip) => (
          <li key={clip.id} style={{ marginBottom: '1rem' }}>
            <div>🎞️ タイトル: {clip.title}</div>
            <div>🕒 開始: {clip.startTime} - 終了: {clip.endTime}</div>
            <div>📺 サービス: {clip.service}</div>
            <div>👤 ユーザー: {clip.user}</div>
            <div>🔗 URL: {clip.url}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
