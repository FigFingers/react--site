// biome-ignore-all lint/security/noSecrets: Japanese UI labels are false positives.
"use client";

import { type RefObject, useId } from "react";

type CommentDeleteConfirmProps = {
  cancelButtonRef: RefObject<HTMLButtonElement | null>;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * コメント削除の確認。window.confirm だとネイティブのダイアログがモーダルの
 * フォーカス管理の外に出て、閉じた後のフォーカスの戻り先も制御できないため、
 * 通報フォームと同じくコメントの下に出す。
 *
 * 削除の通信中もこの欄は残す。押した「削除する」ボタンを DOM から外すと、
 * フォーカスがダイアログの外（body）へ落ちるため。同じ理由で、通信中の
 * 「削除する」は disabled にせず aria-disabled で示す（二重送信は呼び出し側で防ぐ）。
 */
export default function CommentDeleteConfirm({
  cancelButtonRef,
  deleting,
  onCancel,
  onConfirm,
}: CommentDeleteConfirmProps) {
  const questionId = useId();
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-chip p-2.5 text-[12px]"
      aria-busy={deleting}
    >
      <p className="min-w-0 flex-1 font-extrabold" id={questionId}>
        このコメントを削除しますか？
      </p>
      <button
        ref={cancelButtonRef}
        type="button"
        onClick={onCancel}
        disabled={deleting}
        aria-describedby={questionId}
        className="cursor-pointer rounded-full border-2 border-ink bg-white px-3 py-1 font-extrabold disabled:cursor-not-allowed disabled:opacity-40"
      >
        キャンセル
      </button>
      <button
        type="button"
        onClick={onConfirm}
        aria-disabled={deleting}
        aria-describedby={questionId}
        className="cursor-pointer rounded-full bg-accent px-3 py-1 font-extrabold text-white aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
      >
        {deleting ? "削除中…" : "削除する"}
      </button>
    </div>
  );
}
