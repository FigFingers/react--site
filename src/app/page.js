"use server";

import { auth } from "@/auth"; // ← これを使う

import ClipList from "@/app/base/clip/clipCluster";
import PlayList from "@/app/base/playlist/playlist";

export default async function app() {
  const session = await auth(); // ← これだけでOK
  const userId = session?.user?.id ?? null;

  return (
    <>
      <ClipList clipApiUrl="/api/random10" userId={userId} />
      <PlayList PlayList_Data_Url="/api/playlists/all/client"  />
    </>
  );
}
