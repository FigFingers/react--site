"use client";

import { type RefObject, useEffect, useRef } from "react";

/**
 * onEscape は Escape が押されたときに呼ぶ。モーダルを閉じるかどうかは呼び出し側が決める
 * （開いている確認欄やフォームを先に閉じるため）。同一性が変わると effect が走り直して
 * フォーカスをダイアログへ戻してしまうので、呼び出し側は安定した関数を渡すこと。
 */
export function useCommentDialogFocus(
  isOpen: boolean,
  dialogRef: RefObject<HTMLDivElement | null>,
  onEscape: () => void,
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // モーダルへフォーカスを移し、Tab を内部に閉じ込め、閉じたら元へ戻す。
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          // biome-ignore lint/security/noSecrets: Static CSS selector for keyboard focus targets.
          'button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      const active = document.activeElement;
      if (
        e.shiftKey &&
        (active === first ||
          active === dialogRef.current ||
          !dialogRef.current.contains(active))
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (active === last || !dialogRef.current.contains(active))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [onEscape, dialogRef, isOpen]);
}
