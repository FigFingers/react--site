// src/app/(site_data)/(protected)/playlists/[playlistId]/SortableClipItem.tsx
"use client";

import { memo, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Clip from "@/app/base/clip/clipData";

interface ClipData {
  id: number;
  title: string;
  clipName: string;
  user: string;
  service: string;
  startTime: number;
  endTime: number;
  url: string;
  epnumber: string;
}

interface Props {
  playlistClipId: number;
  clip: ClipData;
  userId: string | null;
}

function SortableClipItem({ playlistClipId, clip, userId }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: playlistClipId });

  // ✅ style オブジェクトを useMemo 化（レンダリング安定）
  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      touchAction: "none", // ← スクロール干渉防止（UX向上）
    }),
    [transform, transition]
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Clip
        name={clip.clipName || "切り抜き"}
        title={clip.title || "タイトルがありません"}
        epnum={clip.epnumber || ""}
        url={clip.url || "/browse"}
        username={clip.user || "名無し"}
        icon={clip.service || "unknown"}
        userId={userId}
        starttime={clip.startTime}
        endtime={clip.endTime}
        Id={clip.id}
      />
    </div>
  );
}

// ✅ DnD時以外の無駄な再描画を完全ブロック
export default memo(SortableClipItem);
