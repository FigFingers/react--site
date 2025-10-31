"use client";
import '@/app/globals.css';
import ClipList from '@/app/base/clip/clipCluster';


export default function app() {
  return (
<>
  <ClipList clipApiUrl="api/search?user=yabuki" />
  {/* 後ほどsearchでのuserID完全一致に書き換え */}
</>
);}