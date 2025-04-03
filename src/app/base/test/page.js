"use client";

import { useEffect } from 'react';

const CustomEventComponent = () => {
  useEffect(() => {
    // カスタムイベントの作成
    const customEvent = new CustomEvent('myCustomEvent', {
      detail: { message: 'これはカスタムイベントです。' },
    });

    // イベントリスナーの登録
    const handleCustomEvent = (event) => {
      console.log(event.detail.message);
    };

    window.addEventListener('myCustomEvent', handleCustomEvent);

    // コンポーネントのクリーンアップ時にリスナーを削除
    return () => {
      window.removeEventListener('myCustomEvent', handleCustomEvent);
    };
  }, []);

  // ボタンのクリックでカスタムイベントを発火
  const triggerCustomEvent = () => {
    const customEvent = new CustomEvent('myCustomEvent', {
      detail: { message: 'ボタンから発火されたカスタムイベントです。' },
    });
    window.dispatchEvent(customEvent);
  };

  return (
    <div>
      <h1>カスタムイベントの例</h1>
      <button onClick={triggerCustomEvent}>カスタムイベントを発火</button>
    </div>
  );
};

export default CustomEventComponent;
