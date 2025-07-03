"use client";
import '@/app/globals.css';
import HeadSearch from'@/app/base//base/headSearch/headSearch'; ; // ヘッダー
import Sidebar from '@/app/base/base/sidebar/sidebar';
import ClipList from '@/app/base/clip/clipCluster';
import PlayList from '@/app/base/playlist/playlist';

export default function app() {
  return (
<>
<Sidebar/>
<div className="main-content">
<HeadSearch/>
<ClipList clipApiUrl="http://localhost:3000/api/search?user=yabuki" />{/* 後ほどsearchでのuserID完全一致に書き換え */}
</div>
</>
);}