import ClipList from "@/app/base/clip/clipCluster";
import PlayList from "@/app/base/playlist/playlist";
import { getCurrentUser } from "@/server/auth/session";

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = params.q ?? "";

  const user = await getCurrentUser({ id: true });
  const userId = user?.id ?? null;

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
