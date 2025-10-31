"use server";

import { auth } from "@/auth"; // ← これを使う

import ClipList from "@/app/base/clip/clipCluster";

export default async function app() {
  const session = await auth(); // ← これだけでOK
  const userId = session?.user?.id ?? null;

  return (
    <>
<ClipList clipApiUrl="api/search?user=yabuki"  userId={userId} />

    </>
  );
}
