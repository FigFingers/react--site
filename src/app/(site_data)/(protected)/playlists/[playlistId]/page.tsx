// src/app/(site_data)/(protected)/playlists/[playlistId]/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { resolveCurrentUserDisplayName } from "@/lib/users/displayName";
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
        include: {
          clip: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  nickname: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!playlist) return <div>Not Found</div>;

  const playlistWithCurrentClipUsers = {
    ...playlist,
    clips: playlist.clips.map((playlistClip) => {
      const { owner, ...clip } = playlistClip.clip;
      return {
        ...playlistClip,
        clip: {
          ...clip,
          user: owner ? resolveCurrentUserDisplayName(owner) : clip.user,
        },
      };
    }),
  };

  const serialized = JSON.parse(JSON.stringify(playlistWithCurrentClipUsers));


  return (
    <div className="p-6">
    <h1 className="text-xl font-semibold mb-4">{serialized.name}</h1>
      {/* ✅ これで PlaylistView 以下は完全に Client-only */}
      <PlaylistView playlist={serialized} userId={userId} />
    </div>
  );
}

