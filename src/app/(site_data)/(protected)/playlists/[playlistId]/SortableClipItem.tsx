"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableClipItemProps = {
  playlistClipId: number;
  playlistId: number;
  order: number;
  clip: {
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
};

export default function SortableClipItem({
  playlistClipId,
  playlistId,
  order,
  clip,
}: SortableClipItemProps) {

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: playlistClipId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border rounded p-2 bg-white shadow-sm"
    >
      <div className="flex justify-between">
        <span>{clip.clipName} {clip.title}</span> 
        <b><span className="text-gray-500 text-sm">#{order}</span></b>
      </div>
    </div>
  );
}
