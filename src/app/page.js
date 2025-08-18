"use client";
import ClipList from '@/app/base/clip/clipCluster';
import PlayList from '@/app/base/playlist/playlist';

export default function app() {
  return (
<>
  <ClipList clipApiUrl="/api/random10" />
  <PlayList PlayList_Data_Url="/test_data/mylist.json"/>
</>
);
}