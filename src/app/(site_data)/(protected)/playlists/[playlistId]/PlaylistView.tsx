// src/app/(site_data)/(protected)/playlists/[playlistId]/PlaylistView.tsx
"use client";

import { useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import SortableClipItem from "./SortableClipItem";

type Clip = {
  id: number;
  title: string;
  clipName: string;
  user: string;
  service: string;
  startTime: number;
  endTime: number;
  url: string;
  epnumber: string;
  createdAt: Date;
};

type PlaylistClip = {
  id: number;
  order: number;
  clip: Clip;
};

type PlaylistData = {
  id: number;
  name: string;
  clips: PlaylistClip[];
};

export default function PlaylistView({ playlist }: { playlist: PlaylistData }) {
  const [items, setItems] = useState<PlaylistClip[]>(playlist.clips);

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const reordered = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({
      ...it,
      order: idx + 1,
    }));

    setItems(reordered);

    await fetch(`/api/playlists/${playlist.id}/order`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        reordered.map(({ clip, order }) => ({
        clipId: clip.id,
        order,
      }))
    ),
    });
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((pc) => (
            <SortableClipItem
              key={pc.id}
              playlistClipId={pc.id}
              playlistId={playlist.id}
              order={pc.order}
              clip={pc.clip}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
