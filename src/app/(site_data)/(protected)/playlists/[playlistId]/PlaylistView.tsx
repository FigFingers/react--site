// src/app/(site_data)/(protected)/playlists/[playlistId]/PlaylistView.tsx
"use client";

import { useState, useMemo ,useEffect} from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent, // ✅ 型を追加
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableClipItem from "./SortableClipItem";

interface Clip {
  id: number;
  title: string;
  clipName: string;
  user: string;
  service: string;
  startTime: number;
  endTime: number;
  url: string;
  epnumber: string;
  rating?: number;
}

interface PlaylistClip {
  id: number;
  order: number;
  clip: Clip;
}

interface PlaylistData {
  id: number;
  name: string;
  clips: PlaylistClip[];
  userId: string;
}

interface PlaylistViewProps {
  playlist: PlaylistData;
  userId: string | null;
}
export default function PlaylistView({ playlist, userId }: PlaylistViewProps) {
　const isOwner = userId === playlist.userId;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // PlaylistView.tsx の関数先頭あたり
  console.log("PlaylistView isOwner check =>", { pageUserId: userId, ownerId: playlist.userId });


  // ✅ Hooks はここからすべて実行される（順序が安定する）
  const initialItems = useMemo(() => playlist.clips, [playlist.id]);
  const [items, setItems] = useState(initialItems);

  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    if (!isOwner) return; // 所有者でなければ並び替え不可
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const newOrder = arrayMove(items, oldIndex, newIndex);
    setItems(newOrder);

    try {
      await fetch(`/api/playlists/${playlist.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          newOrder.map((item, index) => ({
            id: item.id,
            order: index,
          }))
        ),
      });
    } catch (err) {
      setItems(items);
      console.error("Reorder failed:", err);
    }
  }

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  // ✅ UIの中で非表示。Hooks順序は壊れない
  if (!mounted) return <div />;

  return (
    <DndContext
      sensors={isOwner ? sensors : undefined} // ✅ 他人の場合はDND無効sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    > 
      <button
        onClick={async () => {
          const res = await fetch(`/api/playlists/${playlist.id}/play`);
          const data = await res.json();

          // localStorage に保存
          localStorage.setItem("playQueue", JSON.stringify(data.clips));

          console.log("PLAY_PLAYLIST_START message sent");
          console.log(data.clips);

          // 再生開始イベントを送信
          window.postMessage({ type: "PLAY_PLAYLIST_START" });
        }}
        className="bg-green-600 text-white px-3 py-1 rounded mb-3"
      > 
        ▶ プレイリスト再生
      </button>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {items.map((pc) => (
          <SortableClipItem
            key={pc.id}
            playlistId={playlist.id}
            playlistClipId={pc.id}
            clip={pc.clip}
            userId={userId}
            isOwner={isOwner}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

