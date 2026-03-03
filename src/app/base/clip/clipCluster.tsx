"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Clip from "@/app/base/clip/clipData";
import ServiceTabs, { ALL_SERVICE, toServiceKey, toServicePanelId, toServiceTabId } from "@/app/base/clip/ServiceTabs";

const DISPLAY_SIZE = 10;

type ClipItem = {
  id?: number;
  clipName?: string;
  title?: string;
  epnumber?: string;
  url?: string;
  user?: string;
  service?: string;
  startTime?: number;
  endTime?: number;
};

type ClipResponse = {
  items?: ClipItem[];
  nextCursor?: number | null;
};

type ClipListProps = {
  clipApiUrl: string;
  userId: string | null;
};

export default function ClipList({ clipApiUrl, userId }: ClipListProps) {
  const [cache, setCache] = useState<ClipItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [selectedService, setSelectedService] = useState<string>(ALL_SERVICE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // StrictMode 対策：同じ clipApiUrl での二重フェッチを防ぐフラグ
  const didFetchRef = useRef<string | null>(null);

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

      const json: ClipResponse = JSON.parse(text);
      if (!json.items) throw new Error("items がありません");

      setCache((prev) => [...prev, ...json.items!]);
      setCursor(json.nextCursor ?? null);
    } catch (err: unknown) {
      console.error("データ取得エラー:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCache([]);
    setCursor(null);
    setVisibleIndex(0);
    setError(null);
    setLoading(true);

    if (didFetchRef.current === clipApiUrl) {
      return;
    }
    didFetchRef.current = clipApiUrl;

    fetchChunk(null);
  }, [clipApiUrl]);

  const services = useMemo(() => {
    const unique = new Set<string>();

    cache.forEach((item) => {
      if (item.service) {
        unique.add(toServiceKey(item.service));
      }
    });

    return Array.from(unique)
      .sort()
      .map((service) => ({ key: service, label: service }));
  }, [cache]);

  const filteredCache = useMemo(() => {
    if (selectedService === ALL_SERVICE) {
      return cache;
    }

    return cache.filter((item) => toServiceKey(item.service ?? "") === selectedService);
  }, [cache, selectedService]);

  const handleServiceChange = useCallback((service: string) => {
    setSelectedService(service);
    setVisibleIndex(0);
  }, []);

  const nextPage = () => {
    const nextIdx = visibleIndex + DISPLAY_SIZE;

    const shouldFetch =
      cursor !== null &&
      (nextIdx >= filteredCache.length - DISPLAY_SIZE || filteredCache.length - nextIdx < 30);

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

  const visibleItems = filteredCache.slice(visibleIndex, visibleIndex + DISPLAY_SIZE);

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
      <ServiceTabs services={services} value={selectedService} onChange={handleServiceChange} />

      <section
        id={toServicePanelId(selectedService)}
        role="tabpanel"
        aria-labelledby={toServiceTabId(selectedService)}
        className="content-list"
      >
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
          <p>このサービスのクリップはまだありません。</p>
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
          disabled={cursor === null && visibleIndex + DISPLAY_SIZE >= filteredCache.length}
          className="px-4 py-2 rounded bg-gray-600 text-white disabled:bg-gray-400"
        >
          次へ
        </button>
      </div>
    </>
  );
}
