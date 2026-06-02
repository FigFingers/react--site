"use server";

import ClipList from "@/app/base/clip/clipCluster";
import PlayList from "@/app/base/playlist/playlist";
import { auth } from "@/auth"; // ← これを使う

export default async function app() {
  const session = await auth(); // ← これだけでOK
  const userId = session?.user?.id ?? null;

  return (
    <>
      <ClipList clipApiUrl="/api/v1/clips" userId={userId} />
      <PlayList PlayList_Data_Url="/api/v1/playlists" />
    </>
  );
}
