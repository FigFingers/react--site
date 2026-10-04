// biome-ignore-all lint/security/noSecrets: Japanese UI labels are false positives.
"use client";

import { type RefObject, useId } from "react";

type CommentDeleteConfirmProps = {
  cancelButtonRef: RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * コメント削除の確認。window.confirm だとネイティブのダイアログがモーダルの
 * フォーカス管理の外に出て、閉じた後のフォーカスの戻り先も制御できないため、
 * 通報フォームと同じくコメントの下に出す。
 */
export default function CommentDeleteConfirm({
  cancelButtonRef,
  onCancel,
  onConfirm,
}: CommentDeleteConfirmProps) {
  const questionId = useId();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-chip p-2.5 text-[12px]">
      <p className="min-w-0 flex-1 font-extrabold" id={questionId}>
        このコメントを削除しますか？
      </p>
      <button
        ref={cancelButtonRef}
        type="button"
        onClick={onCancel}
        aria-describedby={questionId}
        className="cursor-pointer rounded-full border-2 border-ink bg-white px-3 py-1 font-extrabold"
      >
        キャンセル
      </button>
      <button
        type="button"
        onClick={onConfirm}
        aria-describedby={questionId}
        className="cursor-pointer rounded-full bg-accent px-3 py-1 font-extrabold text-white"
      >
        削除する
      </button>
    </div>
  );
}
