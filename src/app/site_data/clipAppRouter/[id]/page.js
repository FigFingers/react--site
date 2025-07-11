import { redirect } from 'next/navigation';

export default function ClipPage({ params }) {
  const id = params?.id;

  if (!id) return <h1>Missing ID</h1>;

  // ここでは cookie を書かず、API に任せる
  redirect(`/api/redirectWithCookie?id=${id}`);
}
