"use client";

import React, { useState, useEffect, useRef } from "react";
import Clip from "@/app/base/clip/clipData";

const DISPLAY_SIZE = 10;

type ClipItem = {
  id: number;
  clipName: string | null;
  title: string;
  epnumber: string | null;
  url: string;
  user: string;
  service: string;
  startTime: number;
  endTime: number;
};

type Props = {
  clipApiUrl: string;
  userId: string;
};

export default function ClipList({ clipApiUrl, userId }: Props) {
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [cache, setCache] = useState<ClipItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const didFetchRef = useRef<string | null>(null);

  const effectiveUrl = selectedService
    ? `${clipApiUrl}${clipApiUrl.includes("?") ? "&" : "?"}service=${encodeURIComponent(selectedService)}`
    : clipApiUrl;

  // サービス一覧を初回のみ取得
  useEffect(() => {
    fetch("/api/clips/services")
      .then((r) => r.json())
      .then((data) => setServices(data.services ?? []))
      .catch(() => {});
  }, []);

  // =========================
  // Chunk Fetch
  // =========================
  const fetchChunk = async (cursorValue: number | null = null) => {
    try {
      setLoading(true);

      const hasQuery = effectiveUrl.includes("?");

      const url = cursorValue !== null
        ? `${effectiveUrl}${hasQuery ? "&" : "?"}cursor=${cursorValue}`
        : effectiveUrl;

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
  // 初回ロード・タブ切替・クエリ変更時のリセット
  // =========================
  useEffect(() => {
    setCache([]);
    setCursor(null);
    setVisibleIndex(0);
    setError(null);
    setLoading(true);

    if (didFetchRef.current === effectiveUrl) {
      return;
    }
    didFetchRef.current = effectiveUrl;

    fetchChunk(null);
  }, [effectiveUrl]);

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

  const visibleItems = cache.slice(
    visibleIndex,
    visibleIndex + DISPLAY_SIZE
  );

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
      {services.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSelectedService(null)}
            className={`px-4 py-2 rounded transition ${
              selectedService === null
                ? "bg-white text-gray-900 font-semibold"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            全て
          </button>
          {services.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedService(s)}
              className={`px-4 py-2 rounded transition ${
                selectedService === s
                  ? "bg-white text-gray-900 font-semibold"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

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
          disabled={cursor === null && visibleIndex + DISPLAY_SIZE >= cache.length}
          className="px-4 py-2 rounded bg-gray-600 text-white disabled:bg-gray-400"
        >
          次へ
        </button>
      </div>
    </>
  );
}
