"use client";

import { useState } from "react";
import PlaylistCreateModal from "@/app/base/_components/PlaylistModal";

function Clip({ name, title, epnum, username, icon, rating, url ,starttime, endtime , userId, Id}) {
  let urlLink;
  switch (icon) {
    case "Netflix":
      urlLink = "https://www.netflix.com" + url;
      break;
    case "prime":
      urlLink = "https://www.amazon.co.jp/primevideo" + url;
      break;
    default:
      urlLink = null;
  }

  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    document.cookie = `name=${encodeURIComponent(name)}; path=/; max-age=3600; secure; samesite=lax`;
    document.cookie = `title=${encodeURIComponent(title)}; path=/; max-age=3600; secure; samesite=lax`;
    document.cookie = `username=${encodeURIComponent(username)}; path=/; max-age=3600; secure; samesite=lax`;
    document.cookie = `starttime=${encodeURIComponent(starttime)}; path=/; max-age=3600; secure`;
    document.cookie = `endtime=${encodeURIComponent(endtime)}; path=/; max-age=3600; secure`;
    document.cookie = `url=${encodeURIComponent(url)}; path=/; max-age=3600; secure`;

    const event = new CustomEvent("clipSelected", {
      detail: { name, username, starttime, endtime },
    });
    window.dispatchEvent(event);

    if (urlLink) {
      window.open(urlLink + (urlLink.includes('?') ? '&' : '?') + "t=" + starttime, "_blank");
    } else {
      alert("Invalid link or unknown service");
    }
  };

  return (
    <div className="list-item" data-starttime={starttime} data-endtime={endtime}>
      <p>
        {name} — {title} {epnum} — {username}{" "}
        <button className="clipedbutton" onClick={handleClick}>
          {icon}
        </button>{" "}
        {rating}

        {/* YouTubeみたいに clip の横に + */}
        <button
          onClick={() => setIsOpen(true)}
          className="ml-2 px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
        >
          ＋
        </button>
      </p>
        <PlaylistCreateModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          userId={userId} 
          clipId={Id}
        />
    </div>
  );
}

export default Clip;
