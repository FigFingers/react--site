"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PlaylistOption = {
  id: number;
  name: string;
};

export default function PlaylistModal({
  isOpen,
  onClose,
  clipId,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  clipId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);

  // 既存プレイリスト取得
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const res = await fetch("/api/v1/me/playlists");
      const data = await res.json();
      setPlaylists(data.data ?? []);
    })();
  }, [isOpen]);

  // 新規作成 ＋ clip 追加
  const createPlaylist = async () => {
    if (!name.trim()) return;
    const res = await fetch("/api/v1/me/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) return;
    const playlist = await res.json();

    await fetch(`/api/v1/playlists/${playlist.id}/clips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipId }),
    });

    onClose();
    router.push(`/playlists/${playlist.id}`);
  };

  // 既存プレイリストに追加
  const addToPlaylist = async (playlistId: string) => {
    await fetch(`/api/v1/playlists/${playlistId}/clips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipId }),
    });

    onClose();
    router.push(`/playlists/${playlistId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 space-y-6">
        {/* 新規作成 */}
        <div>
          <h2 className="text-lg font-semibold mb-2">
            新しいプレイリストを作成
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="プレイリスト名"
              className="border px-3 py-2 rounded w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              className="bg-blue-600 text-white px-4 rounded"
              onClick={createPlaylist}
            >
              作成
            </button>
          </div>
        </div>

        <hr />

        {/* 既存プレイリスト */}
        <div>
          <h3 className="text-md font-semibold mb-2">
            既存のプレイリストに追加
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {playlists.length === 0 && (
              <p className="text-sm text-gray-500">
                まだプレイリストがありません
              </p>
            )}

            {playlists.map((p) => (
              <button
                type="button"
                key={p.id}
                className="w-full text-left border px-3 py-2 rounded hover:bg-gray-100"
                onClick={() => addToPlaylist(String(p.id))}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="text-right">
          <button type="button" onClick={onClose} className="px-4 py-2">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
