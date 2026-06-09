"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

//
// --- 型定義 ------------------------------
//

export interface PlaylistItem {
  id: number;
  name: string;
  user_name: string;
  data: string;
}

export interface PlaylistApiResponse {
  items?: PlaylistItem[];
  data?: Array<Record<string, unknown>>;
  meta?: { nextCursor?: string | null };
  nextCursor?: string | null;
}

interface PlayListProps {
  name: string;
  username: string;
  data: string;
}

interface PlayListClusterProps {
  PlayList_Data_Url: string;
}

//
// --- 単一アイテム表示コンポーネント --------
//

function PlayList({ name, username, data }: PlayListProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/playlists/${data}`);
  };

  return (
    <div className="grid-item">
      <p>
        <strong>{name}</strong>
      </p>
      <p>{username}</p>
      <button onClick={handleClick} type="button">
        go
      </button>
    </div>
  );
}

//
// --- メインコンポーネント（ページネーション対応） --------
//

const DISPLAY_SIZE = 10;

export default function PlayListCluster({
  PlayList_Data_Url,
}: PlayListClusterProps) {
  const [cache, setCache] = useState<PlaylistItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const didFetchRef = useRef<string | null>(null);

  //
  // --- Fetch 処理 ------------------------
  //

  const fetchChunk = async (cursorValue: string | null = null) => {
    try {
      setLoading(true);

      const hasQuery = PlayList_Data_Url.includes("?");
      const url =
        cursorValue !== null
          ? `${PlayList_Data_Url}${hasQuery ? "&" : "?"}cursor=${cursorValue}`
          : PlayList_Data_Url;

      console.log("[PlayList] FETCH URL:", url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      const json: PlaylistApiResponse = await res.json();
      const items = normalizePlaylistItems(json);

      setCache((prev) => [...prev, ...items]);
      setCursor(json.meta?.nextCursor ?? json.nextCursor ?? null);
    } catch (err: unknown) {
      console.error("Playlist fetch error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  //
  // --- 初回ロード & URL変更時のリセット ----
  //

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy fetch callback is intentionally local to URL changes.
  useEffect(() => {
    setCache([]);
    setCursor(null);
    setVisibleIndex(0);
    setError(null);
    setLoading(true);

    if (didFetchRef.current === PlayList_Data_Url) return;
    didFetchRef.current = PlayList_Data_Url;

    fetchChunk(null);
  }, [PlayList_Data_Url]);

  //
  // --- Navigation ------------------------
  //

  const nextPage = () => {
    const nextIdx = visibleIndex + DISPLAY_SIZE;

    const shouldFetch =
      cursor !== null &&
      (nextIdx >= cache.length - DISPLAY_SIZE || cache.length - nextIdx < 30);

    if (shouldFetch) {
      fetchChunk(cursor);
    }

    setVisibleIndex(nextIdx);
  };

  const prevPage = () => {
    const prevIdx = visibleIndex - DISPLAY_SIZE;
    if (prevIdx >= 0) setVisibleIndex(prevIdx);
  };

  const visibleItems = cache.slice(visibleIndex, visibleIndex + DISPLAY_SIZE);

  //
  // --- Rendering -------------------------
  //

  if (loading && cache.length === 0) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <>
      <section className="content-grid">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <PlayList
              key={item.id}
              name={item.name}
              username={item.user_name}
              data={item.data}
            />
          ))
        ) : (
          <p>データが見つかりません。</p>
        )}
      </section>

      {/* Navigation */}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={prevPage}
          disabled={visibleIndex === 0}
          className="px-4 py-2 rounded bg-gray-600 text-white disabled:bg-gray-400"
        >
          前へ
        </button>

        <button
          type="button"
          onClick={nextPage}
          disabled={
            cursor === null && visibleIndex + DISPLAY_SIZE >= cache.length
          }
          className="px-4 py-2 rounded bg-gray-600 text-white disabled:bg-gray-400"
        >
          次へ
        </button>
      </div>
    </>
  );
}

function normalizePlaylistItems(json: PlaylistApiResponse): PlaylistItem[] {
  const source: unknown[] | undefined = Array.isArray(json.data)
    ? json.data
    : json.items;
  if (!Array.isArray(source)) {
    throw new Error("Invalid API result: items missing");
  }

  return source.map((rawItem) => {
    const item =
      typeof rawItem === "object" && rawItem !== null
        ? (rawItem as Record<string, unknown>)
        : {};

    return {
      id: Number(item.id),
      name: String(item.name ?? "Untitled"),
      user_name: String(
        (item.user as Record<string, unknown>)?.name ??
          item.user_name ??
          item.userName ??
          "unknown",
      ),
      data: String(item.data ?? item.id),
    };
  });
}
