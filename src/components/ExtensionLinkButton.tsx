// biome-ignore-all lint/security/noSecrets: Japanese UI messages are false positives.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  EXTENSION_LINK_NO_RESPONSE,
  ExtensionLinkError,
  linkExtensionToCurrentUserFromUserAction,
} from "@/lib/extension/client";

type Status = "idle" | "loading" | "success" | "error";

const MESSAGE_TIMEOUT =
  "拡張機能が応答しませんでした。インストールされているか確認してください。";
const MESSAGE_AUTH = "ログイン状態を確認してから再度お試しください。";
const MESSAGE_SUCCESS = "拡張機能の連携が完了しました。";
const LABEL_LOADING = "連携中...";
const LABEL_LINKED = "連携済み";
const LABEL_LINK = "拡張機能を連携する";

function resolveErrorMessage(message: string): string {
  if (message === "Extension response timeout") {
    return MESSAGE_TIMEOUT;
  }
  if (message === "UNAUTHORIZED" || message === "Authentication required") {
    return MESSAGE_AUTH;
  }
  return `連携に失敗しました: ${message}`;
}

const LINK_FAILURE_MESSAGES = new Map<string, string>([
  [
    "link_token_expired",
    "連携の受付期限が切れました。もう一度「拡張機能を連携する」を押してください。",
  ],
  [
    "link_token_used",
    "この連携要求は使用済みです。もう一度「拡張機能を連携する」を押してください。",
  ],
  [
    "instance_mismatch",
    "拡張機能の識別情報が一致しませんでした。ページを再読み込みしてから再度お試しください。",
  ],
  [
    "origin_not_allowed",
    "サイト側で拡張機能のIDが許可されていないため、連携できません。許可設定を確認してください。",
  ],
  [
    "timeout",
    "拡張機能とサイトの通信がタイムアウトしました。時間をおいて再度お試しください。",
  ],
  [
    "network_error",
    "拡張機能からサイトへの通信に失敗しました。時間をおいて再度お試しください。",
  ],
  [
    "background_unavailable",
    "拡張機能のbackgroundに接続できません。拡張機能を再読み込みしてから再度お試しください。",
  ],
  [
    EXTENSION_LINK_NO_RESPONSE,
    "拡張機能から連携結果が返りませんでした。拡張機能が未インストールか、古いバージョンの可能性があります。",
  ],
]);
const MESSAGE_LINK_FAILED =
  "拡張機能の連携に失敗しました。再度お試しください。";

export function ExtensionLinkButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleClick() {
    setStatus("loading");
    setMessage("");

    try {
      await linkExtensionToCurrentUserFromUserAction();
      setStatus("success");
      setMessage(MESSAGE_SUCCESS);
    } catch (err) {
      if (err instanceof ExtensionLinkError) {
        setStatus("error");
        setMessage(
          LINK_FAILURE_MESSAGES.get(err.reason) ?? MESSAGE_LINK_FAILED,
        );
        return;
      }

      const errMsg = err instanceof Error ? err.message : String(err);

      if (errMsg === "Unauthorized" || errMsg === "Authentication required") {
        router.push("/login");
        return;
      }

      setStatus("error");
      setMessage(resolveErrorMessage(errMsg));
    }
  }

  return (
    <div>
      <button
        className="cursor-pointer rounded-full border-2 border-ink bg-white px-4 py-1.5 text-[13px] font-extrabold hover:bg-chip disabled:cursor-not-allowed disabled:opacity-40"
        disabled={status === "loading" || status === "success"}
        onClick={handleClick}
        type="button"
      >
        {status === "loading"
          ? LABEL_LOADING
          : status === "success"
            ? LABEL_LINKED
            : LABEL_LINK}
      </button>
      {message && (
        <p
          className={
            status === "success"
              ? "mt-2 text-[13px] font-bold text-emerald-700"
              : "mt-2 text-[13px] font-bold text-accent"
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
