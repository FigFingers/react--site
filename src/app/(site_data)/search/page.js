import { auth } from "@/auth";
import ClipList from "@/app/base/clip/clipCluster";
import PlayList from "@/app/base/playlist/playlist";

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = params.q ?? "";


  const session = await auth();
  const userId = session?.user?.id ?? null;

  return (
    <>
      <ClipList 
        clipApiUrl={`/api/search?q=${encodeURIComponent(q)}`} 
        userId={userId} 
      />
      <PlayList 
        PlayList_Data_Url={`/api/search/playlists?q=${encodeURIComponent(q)}`}
      />
    </>
  );
}
