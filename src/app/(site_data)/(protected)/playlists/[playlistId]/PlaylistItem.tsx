// @ts-nocheck

"use client";

export default function PlaylistItem({ id, clip, order }) {
  return (
    <div className="p-2 border rounded">
      {order}. {clip.title}
    </div>
  );
}
