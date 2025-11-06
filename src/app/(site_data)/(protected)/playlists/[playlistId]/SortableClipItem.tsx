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
  isOwner: boolean;
  playlistId: number;
}

function SortableClipItem({ playlistClipId, playlistId, clip, userId, isOwner }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: playlistClipId });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      touchAction: "none",
    }),
    [transform, transition]
  );

  return (
<div
  ref={setNodeRef}
  style={style}
  className="
    flex items-center justify-between
    p-3 rounded-lg border border-neutral-700
    bg-neutral-900/50 hover:bg-neutral-900/70 hover:border-neutral-500
    transition-colors
  "
>
  {/* 左: Clip本体 */}
  <div className="flex-1">
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
       {/* 右: ハンドル & 削除 */}
  {isOwner && (
    <div className="flex items-center gap-3 ml-3 select-none">
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-white transition text-lg"
      >
        ☰
      </div>

      <button
        onClick={async () => {
            await fetch(`/api/playlists/${playlistId}/clips/${playlistClipId}`, {
              method: "DELETE",
            });
            location.reload();
          }}
        className="text-red-400 hover:text-red-300 text-xl leading-none"
      >
        ×
      </button>
    </div>
  )}


    </div>
  );
}

export default memo(SortableClipItem);
