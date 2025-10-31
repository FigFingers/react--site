// src/app/(site_data)/(protected)/playlists/[playlistId]/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { prisma } from "@/lib/prisma";
import PlaylistView from "./PlaylistView";

export default async function PlaylistPage(props: { params: Promise<{ playlistId: string }> }) {
  const { playlistId } = await props.params;

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

  // ✅ Hydration差異防止。Date → string などに統一
  const serialized = JSON.parse(JSON.stringify(playlist));

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">{serialized.name}</h1>
      {/* ✅ serialized を渡す */}
      <PlaylistView playlist={serialized} />
    </div>
  );
}

