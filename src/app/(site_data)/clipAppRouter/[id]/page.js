// src/app/(site_data)/clipAppRouter/[id]/page.js
// クリップ個別ページ　リダイレクト用
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';

export default async function ClipPage({ params }) {
  const id = params?.id;

  if (!id) return <h1>Missing ID</h1>;

  // ここでは cookie を書かず、API に任せる
  redirect(`/api/redirectWithCookie?id=${id}`);
}
