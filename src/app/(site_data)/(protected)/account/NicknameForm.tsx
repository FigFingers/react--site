"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type NicknameFormProps = {
  currentName: string;
  initialNickname: string;
};

export default function NicknameForm({
  currentName,
  initialNickname,
}: NicknameFormProps) {
  const router = useRouter();
  const [savedNickname, setSavedNickname] = useState(initialNickname);
  const [draftNickname, setDraftNickname] = useState(initialNickname);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const displayName = savedNickname || currentName;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/account/nickname", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname: draftNickname }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "ニックネームの更新に失敗しました。");
        return;
      }

      const savedNickname = result.nickname ?? "";
      setDraftNickname(savedNickname);
      setSavedNickname(savedNickname);
      setMessage("ニックネームを更新しました。");
      setIsEditing(false);
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDraftNickname(savedNickname);
    setMessage("");
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div className="nickname-display">
        <span>{displayName}</span>
        <button
          className="change-button"
          onClick={() => setIsEditing(true)}
          type="button"
        >
          変更
        </button>
        {message ? <p className="nickname-message">{message}</p> : null}
      </div>
    );
  }

  return (
    <form className="nickname-form" onSubmit={handleSubmit}>
      <input
        aria-label="ニックネーム"
        className="nickname-input"
        maxLength={30}
        onChange={(event) => setDraftNickname(event.target.value)}
        placeholder={displayName}
        type="text"
        value={draftNickname}
      />
      <button className="change-button" disabled={isSaving} type="submit">
        {isSaving ? "保存中" : "保存"}
      </button>
      <button
        className="change-button"
        disabled={isSaving}
        onClick={handleCancel}
        type="button"
      >
        キャンセル
      </button>
      {message ? <p className="nickname-message">{message}</p> : null}
    </form>
  );
}
