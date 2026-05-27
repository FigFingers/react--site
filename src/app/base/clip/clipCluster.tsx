// @ts-nocheck
// biome-ignore-all lint: legacy compatibility component pending v1 migration

"use client";

import React, { useEffect, useRef, useState } from "react";
import Clip from "@/app/base/clip/clipData";

const DISPLAY_SIZE = 10;

export default function ClipList({ clipApiUrl, userId }) {
  const [cache, setCache] = useState([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // StrictMode 対策：同じ clipApiUrl での二重フェッチを防ぐフラグ
  const didFetchRef = useRef<string | null>(null);

  // =========================
  // Chunk Fetch
  // =========================
  const fetchChunk = async (cursorValue: number | null = null) => {
    try {
      setLoading(true);

      const hasQuery = clipApiUrl.includes("?");

      const url =
        cursorValue !== null
          ? `${clipApiUrl}${hasQuery ? "&" : "?"}cursor=${cursorValue}`
          : clipApiUrl;

      console.log("[ClipList] FETCH URL:", url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);

      const text = await res.text();
      if (!text) throw new Error("レスポンスが空です");

      const json = JSON.parse(text);
      if (!json.items) throw new Error("items がありません");

      setCache((prev) => [...prev, ...json.items]);
      setCursor(json.nextCursor ?? null);
    } catch (err: any) {
      console.error("データ取得エラー:", err);
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 初回ロード & クエリ変更時のリセット
  // =========================
  useEffect(() => {
    // clipApiUrl が変わったら state をリセット
    setCache([]);
    setCursor(null);
    setVisibleIndex(0);
    setError(null);
    setLoading(true);

    // StrictMode 対策：同じ URL で2回呼ばない
    if (didFetchRef.current === clipApiUrl) {
      return;
    }
    didFetchRef.current = clipApiUrl;

    fetchChunk(null);
  }, [clipApiUrl]);

  // =========================
  // Navigation
  // =========================
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
    if (prevIdx >= 0) {
      setVisibleIndex(prevIdx);
    }
  };

  const visibleItems = cache.slice(visibleIndex, visibleIndex + DISPLAY_SIZE);

  // カスタムイベント
  useEffect(() => {
    if (!loading && visibleItems.length > 0) {
      const event = new CustomEvent("clipListElementsRendered", {
        detail: { itemCount: visibleItems.length },
      });
      window.dispatchEvent(event);
    }
  }, [loading, visibleItems]);

  if (loading && cache.length === 0) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <>
      <section className="content-list">
        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => (
            <Clip
              key={item.id ?? index}
              name={item.clipName || "切り抜き"}
              title={item.title || "タイトルなし"}
              epnum={item.epnumber || "エラー"}
              url={item.url || "/browse"}
              username={item.user || "ユーザー不明"}
              icon={item.service || "unknown"}
              starttime={item.startTime}
              endtime={item.endTime}
              userId={userId}
              Id={item.id}
            />
          ))
        ) : (
          <p>データがありません。</p>
        )}
      </section>

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
