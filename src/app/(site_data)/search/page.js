import ClipList from "@/app/base/clip/clipCluster";
import PlayList from "@/app/base/playlist/playlist";
import { auth } from "@/auth";

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = params.q ?? "";

  const session = await auth();
  const userId = session?.user?.id ?? null;

  return (
    <>
      <ClipList
        clipApiUrl={`/api/v1/clips?title=${encodeURIComponent(q)}`}
        userId={userId}
      />
      <PlayList
        PlayList_Data_Url={`/api/v1/playlists?name=${encodeURIComponent(q)}`}
      />
    </>
  );
}
