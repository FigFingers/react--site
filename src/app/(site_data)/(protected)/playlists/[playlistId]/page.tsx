// src/app/(site_data)/(protected)/playlists/[playlistId]/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
// ✅ dynamic import やめる
import PlaylistView from "./PlaylistView.client"; 

export default async function PlaylistPage({ params }) {
  const { playlistId } = await params;

  const playlist = await prisma.playlist.findUnique({
    where: { id: Number(playlistId) },
    include: {
      clips: {
        orderBy: { order: "asc" },
        include: { clip: true },
      },
    },
  });

  if (!playlist) return <div>Not Found</div>;

  const serialized = JSON.parse(JSON.stringify(playlist));
  const session = await auth();
  const userId = session?.user?.id ?? null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">{serialized.name}</h1>
      {/* ✅ これで PlaylistView 以下は完全に Client-only */}
      <PlaylistView playlist={serialized} userId={userId} />
    </div>
  );
}

