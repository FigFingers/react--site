"use client";

// biome-ignore-all lint/security/noSecrets: Japanese UI labels are false positives.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { linkExtensionToCurrentUser } from "@/lib/extension/client";

type Status = "idle" | "loading" | "success" | "error";

function resolveErrorMessage(message: string): string {
  if (message === "Extension response timeout") {
    return "拡張機能が応答しませんでした。インストールされているか確認してください。";
  }
  if (message === "UNAUTHORIZED" || message === "Authentication required") {
    return "ログイン状態を確認してから再度お試しください。";
  }
  return `連携に失敗しました: ${message}`;
}

export function ExtensionLinkButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleClick() {
    setStatus("loading");
    setMessage("");

    try {
      await linkExtensionToCurrentUser();
      setStatus("success");
      setMessage("拡張機能の連携が完了しました。");
    } catch (err) {
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
        disabled={status === "loading" || status === "success"}
        onClick={handleClick}
        type="button"
      >
        {status === "loading"
          ? "連携中..."
          : status === "success"
            ? "連携済み"
            : "拡張機能を連携する"}
      </button>
      {message && (
        <p style={{ color: status === "success" ? "green" : "red" }}>
          {message}
        </p>
      )}
    </div>
  );
}
