"use client";
import React, { useState } from "react";
import Image from "next/image";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";
import { useSession, signIn, signOut } from "next-auth/react";

export default function HeadSearch() {
  const [searchText, setSearchText] = useState("");
  const { data: session, status } = useSession();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleClick = () => {
    if (!searchText.trim()) {
      alert("検索ワードを入力してください。");
      return;
    }
    alert(`ボタンの内容: ${searchText}`);
    setSearchText("");
  };

  const renderUserAvatar = () => {
    if (status === "loading") {
      return <div>…</div>;
    }
    if (!session?.user) {
      return (
        <div
          className="cursor-pointer"
          onClick={() => signIn("google")}
        >
          <AccountCircleIcon fontSize="large" />
        </div>
      );
    }
    if (session.user.image) {
      return (
        <Image
          src={session.user.image}
          alt={session.user.name ?? "User"}
          width={40}
          height={40}
          className="rounded-full cursor-pointer"
          onClick={() => signOut()}
        />
      );
    }
    const initial = (session.user.name ?? session.user.email ?? "U")
      .slice(0, 1)
      .toUpperCase();
    return (
      <div
        className="h-10 w-10 rounded-full bg-gray-300 grid place-items-center text-sm font-semibold text-gray-700 cursor-pointer"
        onClick={() => signOut()}
      >
        {initial}
      </div>
    );
  };

  return (
    <header className="header">
      <h1>サブスク切り抜き</h1>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Hinted search text"
          value={searchText}
          onChange={handleInputChange}
        />
        <button onClick={handleClick} className="search-icon">
          <SearchIcon />
        </button>
      </div>

      <div className="profile-icon">{renderUserAvatar()}</div>
    </header>
  );
}
