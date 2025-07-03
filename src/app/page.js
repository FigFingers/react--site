"use client";
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
  <ClipList clipApiUrl="http://localhost:3000/api/fetchAll" />
  <PlayList PlayList_Data_Url="/test_data/mylist.json"/>
</div>
</>
);
}