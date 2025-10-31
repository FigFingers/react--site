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
}

interface PlaylistViewProps {
  playlist: PlaylistData;
  userId: string | null;
}
export default function PlaylistView({ playlist, userId }: PlaylistViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ✅ Hooks はここからすべて実行される（順序が安定する）
  const initialItems = useMemo(() => playlist.clips, [playlist.id]);
  const [items, setItems] = useState(initialItems);

  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
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
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {items.map((pc) => (
          <SortableClipItem
            key={pc.id}
            playlistClipId={pc.id}
            clip={pc.clip}
            userId={userId}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

