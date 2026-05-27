// @ts-nocheck

// src/app/(site_data)/(protected)/playlists/[playlistId]/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// ✅ dynamic import やめる
import PlaylistView from "./PlaylistView.client";

export default async function PlaylistPage({ params }) {
  const { playlistId } = await params;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const playlist = await prisma.playlist.findUnique({
    where: { id: Number(playlistId) },
    select: {
      id: true,
      name: true,
      userId: true,
      clips: {
        orderBy: { order: "asc" },
        include: { clip: true },
      },
    },
  });

  if (!playlist) return <div>Not Found</div>;

  const serialized = JSON.parse(JSON.stringify(playlist));

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">{serialized.name}</h1>
      {/* ✅ これで PlaylistView 以下は完全に Client-only */}
      <PlaylistView playlist={serialized} userId={userId} />
    </div>
  );
}
