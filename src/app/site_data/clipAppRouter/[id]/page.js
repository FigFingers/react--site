import { redirect } from 'next/navigation'

export default async function ClipPage({ params }) {
  // cookie設定付きリダイレクト用APIへ転送
  redirect(`/api/redirectWithCookie?id=${id}`)
}

