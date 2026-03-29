# Project Overview

このリポジトリは、サブスクリプション動画サービスの「切り抜き」を保存・検索・プレイリスト化する Next.js アプリです。UI は Web アプリとして動きますが、コードコメントと副作用の作り方から、ブラウザ拡張または外部クライアントとの連携も意識されています。

この README の目的は「LLM が安全に改修できる状態を作ること」です。特に以下を最重要とします。

- どの画面がどの API を呼ぶか
- どの state がどこに存在するか
- どのデータ shape を壊すとどこが壊れるか
- repo 内で完結していない外部依存ポイントがどこか

2026-03-28 時点の観測:

- `npm run build` は成功
- クリップ一覧、検索、プレイリスト作成/追加/削除/並び替え/再生は実装済み
- 認証は `NextAuth + Google OAuth + Prisma Adapter`
- ただし「認可」「データ shape の統一」「外部連携の明確化」は未完成

このアプリを一言で言うと:

- サーバー側で session と DB データを読む Next.js App Router アプリ
- クライアント側で一覧表示、モーダル、DND 並び替えを行う
- Cookie / `localStorage` / `postMessage` / `CustomEvent` を使って外部コンテキストへ情報を渡す設計が混ざっている

# Tech Stack

## Core

- Next.js 15 App Router
- React 19
- TypeScript + JavaScript 混在
- Prisma 6
- SQLite (`prisma/dev.db`)
- NextAuth 5 beta

## UI / Interaction

- `@mui/icons-material`
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

## Auth / Data

- `next-auth`
- `@auth/prisma-adapter`
- `@prisma/client`

## Important Compiler / Project Settings

- `tsconfig.json`
  - `allowJs: true`
  - `strict: false`
  - `@/* -> src/*`
- `jsconfig.json`
  - alias 定義が重複している

意味すること:

- JS と TSX が混在し、型で守られていない箇所が多い
- 「型が通る = 安全」ではない
- LLM は必ず API shape と呼び出し元を実コードで確認すること

## Installed But Not Confirmed as Active Architecture

以下は依存にあるが、現行ソースで中心的な使用は未確認:

- `express`
- `cors`
- `swr`
- `zod`
- `@mui/material`
- `@emotion/react`
- `@emotion/styled`

補足:

- CORS は `cors` パッケージではなく route handler 内の手書きヘッダで対応している
- Tailwind 風クラス名は多いが Tailwind 設定ファイルは見当たらない

# Directory Structure

```text
src/
  auth.ts                         NextAuth 定義
  lib/prisma.ts                   PrismaClient singleton
  providers/session-provider.tsx  client SessionProvider
  app/
    layout.tsx                    全ページ共通レイアウト
    page.js                       ホーム
    globals.css                   全体スタイル
    page.module.css               未使用の可能性が高い
    providers.tsx                 現行レイアウトでは未使用
    styles.css                    空
    ext-auth/                     空
    base/                         UI の中核コンポーネント置き場
      clip/
        clipCluster.tsx           クリップ一覧 fetch + ページ送り
        clipData.js               単一クリップ表示 + Cookie 書き込み + 外部遷移
      playlist/
        playlist.tsx              プレイリスト一覧 fetch + ページ送り
        PlaylistModal.tsx         重複実装の一つ
      _components/
        PlaylistModal.tsx         現在 clipData.js が使う modal
        headSearch/headSearch.tsx ヘッダー検索 + sign in/out
        sidebar/sidebar.js        サイドバー遷移
        sidebar/sidebarData.js    サイドバー項目
        sidebar/sidebarIcon.js    未使用の可能性が高い
        sidebar/page.js           未使用の可能性が高い
    (site_data)/
      search/page.js              検索結果画面
      clipAppRouter/[id]/page.js  Cookie redirect 用の中継ページ
      (auth)/
        login/page.js             Google sign in 導線 + 仮フォーム
        registration/page.js      仮登録フォーム
      (protected)/
        account/page.tsx          ダミーのアカウント表示
        dashboard/page.tsx        開発用ユーザー情報ページ
        done/page.tsx             完了メッセージ
        my_video/page.js          `user=yabuki` 固定の検索画面
        playlists/
          page.tsx                自分のプレイリスト一覧
          [playlistId]/
            page.tsx              プレイリスト詳細の server entry
            PlaylistView.tsx      client の中核ロジック
            PlaylistView.client.tsx
            SortableClipItem.tsx  DND 項目 + 削除ボタン
            PlaylistItem.tsx      未使用の可能性が高い
    api/
      auth/[...nextauth]/route.js
      clips/chunk/route.ts
      search/route.ts
      search/playlists/route.ts
      receive/route.js
      redirectWithCookie/[id]/route.js
      fetchAll/route.js
      fetchClip/route.js
      nextClip/route.js
      random10/route.js
      playlists/
        route.ts
        all/route.ts
        all/client/route.ts
        me/route.ts
        user/[userId]/route.ts
        [playlistId]/route.ts
        [playlistId]/add/route.ts
        [playlistId]/play/route.ts
        [playlistId]/reorder/route.ts
        [playlistId]/clips/[playlistClipId]/route.ts

prisma/
  schema.prisma
  dev.db
  migrations/

public/
  icontest/
  image/
  test_data/
```

# Entry Points

## 1. App bootstrap

最初に読むべき起点:

1. `src/app/layout.tsx`
2. `src/auth.ts`
3. `src/lib/prisma.ts`
4. `src/app/page.js`

流れ:

1. `layout.tsx` がサーバー側で `auth()` を呼ぶ
2. 取得した `session` を `SessionProvider` に渡す
3. 全ページに `Sidebar` と `HeadSearch` を描画する
4. 各 page が必要に応じて `auth()` と Prisma を使う
5. client component が `/api/...` を fetch する

重要:

- `layout.tsx` はログイン画面や `done` ページにも共通 shell を適用する
- つまり auth 専用レイアウトは無い

## 2. Auth bootstrap

`src/auth.ts` が認証の中心:

- `NextAuth(...)`
- `PrismaAdapter(prisma)`
- `session: { strategy: "jwt" }`
- Google provider
- `callbacks.jwt`
- `callbacks.session`

ここで `session.user.id` が追加される。UI と API の多くがこの `id` 前提で動く。

session cookie 名:

- 本番/HTTPS 相当: `__Secure-authjs.session-token`
- 開発/HTTP 相当: `authjs.session-token`

なぜこの構造か:

- `auth.ts` 内コメントに「拡張機能から Cookie で API を叩くため JWT に統一」とある
- そのため認証ロジックを変えると、Web UI だけでなく外部連携の前提も壊しうる

## 3. Playlist detail bootstrap

`src/app/(site_data)/(protected)/playlists/[playlistId]/page.tsx` は playlist 詳細の入口。

やっていること:

1. `await params`
2. `auth()` で `userId` を取得
3. Prisma で playlist と `clips.include({ clip: true })` を読む
4. `JSON.parse(JSON.stringify(...))` で client 渡し用に直列化
5. `PlaylistView.client` を描画

なぜ server page + client view に分かれているか:

- Prisma アクセスと auth 判定は server で行うため
- DND と `localStorage` / `postMessage` は client でしか扱えないため

# Core Architecture

## Functional split

この repo は「レイヤー分離」よりも「機能単位の分離」が強い。

### Clip browsing

- server page: `src/app/page.js`, `src/app/(site_data)/search/page.js`, `src/app/(site_data)/(protected)/my_video/page.js`
- client logic: `src/app/base/clip/clipCluster.tsx`
- item rendering + side effects: `src/app/base/clip/clipData.js`
- data source: `/api/clips/chunk`, `/api/search`

### Playlist browsing and editing

- list page: `src/app/(site_data)/(protected)/playlists/page.tsx`
- detail server page: `src/app/(site_data)/(protected)/playlists/[playlistId]/page.tsx`
- detail client logic: `PlaylistView.tsx`
- sortable row: `SortableClipItem.tsx`
- create/add modal: `_components/PlaylistModal.tsx`
- API set: `/api/playlists/*`

### Search

- search input: `headSearch.tsx`
- server page: `search/page.js`
- API: `/api/search`, `/api/search/playlists`

### Auth

- server auth definition: `src/auth.ts`
- route: `/api/auth/[...nextauth]`
- provider wrapper: `src/providers/session-provider.tsx`
- UI entry: `headSearch.tsx`, `login/page.js`, `dashboard/page.tsx`

### External / integration-style handoff

- inbound clip save: `/api/receive`
- outbound redirect + cookie set: `/api/redirectWithCookie/[id]`
- direct UI cookie write: `clipData.js`
- local queue write: `PlaylistView.tsx`
- browser event dispatch: `clipData.js`, `clipCluster.tsx`, `PlaylistView.tsx`

## Important dependency chains

### Home page chain

`src/app/page.js`
-> `ClipList`
-> `/api/clips/chunk`
-> Prisma `clip.findMany`

`src/app/page.js`
-> `PlayList`
-> `/api/playlists/all`
-> Prisma `playlist.findMany`

### Search page chain

`HeadSearch.handleSearch`
-> `router.push("/search?q=...")`
-> `src/app/(site_data)/search/page.js`
-> `ClipList` with `clipApiUrl=/api/search?q=...`
-> `PlayList` with `PlayList_Data_Url=/api/search/playlists?q=...`

### Playlist create/add chain

`Clip` (+ button)
-> `_components/PlaylistModal`
-> `createPlaylist()` or `addToPlaylist()`
-> `/api/playlists` and `/api/playlists/[playlistId]/add`
-> `router.push("/playlists/[id]")`

### Playlist reorder chain

`PlaylistView.handleDragEnd`
-> optimistic `setItems(newOrder)`
-> `POST /api/playlists/[playlistId]/reorder`
-> Prisma transaction updating `PlaylistClip.order`

### Playlist play chain

`PlaylistView` play button
-> `GET /api/playlists/[playlistId]/play`
-> `localStorage.setItem("playQueue", JSON.stringify(data.clips))`
-> `window.postMessage({ type: "PLAY_PLAYLIST_START" })`

repo 内に `PLAY_PLAYLIST_START` の listener は見当たらない。外部受信側がいる可能性が高いが、これは推定。

# Domain Model and Data Structures

## Persistent DB model

`prisma/schema.prisma` の中核モデル:

### Clip

```ts
type Clip = {
  id: number
  clipName: string | null
  user: string
  service: string
  startTime: number
  endTime: number
  url: string
  title: string
  epnumber: string
  createdAt: Date
}
```

### Playlist

```ts
type Playlist = {
  id: number
  name: string
  userId: string
  createdAt: Date
  updatedAt: Date
}
```

### PlaylistClip

```ts
type PlaylistClip = {
  id: number
  playlistId: number
  clipId: number
  order: number
}
```

### User / Account / Session

NextAuth 用。`User.id` は `string (cuid)`。

## In-memory UI shapes

### `ClipList` が期待する item shape

```ts
type ClipListItem = {
  id: number
  clipName?: string | null
  title: string
  epnumber: string
  url: string
  user: string
  service: string
  startTime: number
  endTime: number
}
```

### `PlayListCluster` が期待する item shape

```ts
type PlaylistListItem = {
  id: number
  name: string
  user_name: string
  data: string
  icon?: string
  preview_clips?: Array<{
    title: string
    service: string
    user: string
  }>
}
```

### `PlaylistView` props shape

```ts
type PlaylistViewProps = {
  playlist: {
    id: number
    name: string
    userId: string
    clips: Array<{
      id: number          // PlaylistClip.id
      order: number
      clip: Clip
    }>
  }
  userId: string | null  // current session user id
}
```

重要:

- `playlist.clips[].id` は `PlaylistClip.id`
- `playlist.clips[].clip.id` は `Clip.id`
- 並び替え API が受ける `id` は `PlaylistClip.id`

## Browser persistence keys

### Cookie keys written by `clipData.js`

- `name`
- `title`
- `username`
- `starttime`
- `endtime`
- `url`

### Cookie keys written by `redirectWithCookie/[id]`

- `name`
- `title`
- `username`
- `starttime`
- `endtime`
- `url`

ただし `name` の中身が異なる:

- `clipData.js`: clip 名を入れる
- `redirectWithCookie/[id]`: 固定で `'切り抜き'`

### localStorage keys

- `playQueue`

格納値:

```ts
type PlayQueueItem = {
  id: number
  clipname: string | null
  title: string
  service: string
  Subtitles: string
  url: string
  startTime: number
  endTime: number
  order: number
}
```

# API Contracts

この repo は API ごとに response shape がかなり違う。統一されていないので、編集前に必ず個別確認すること。

## Primary APIs used by current UI

### `GET /api/clips/chunk`

用途:

- ホームのクリップ一覧

query:

- `cursor?: number`

response:

```json
{
  "items": [ClipListItem],
  "nextCursor": 123
}
```

特徴:

- `CHUNK_SIZE = 100`
- DB は `orderBy: createdAt desc`
- その後 `Math.random()` で chunk 内シャッフル
- `cursor` は `id`

### `GET /api/search`

用途:

- クリップ検索
- `my_video/page.js` の user 固定検索

query:

- `q?: string`
- `user?: string`
- `cursor?: number`

response:

```json
{
  "items": [ClipListItem],
  "nextCursor": 123
}
```

特徴:

- DB の `where` は `title.contains(keyword)` と `user`
- 並び順は `id desc`
- 返却前にタイトル長ベースの軽い並び替え

### `GET /api/playlists/all`

用途:

- ホームのプレイリスト一覧

query:

- `cursor?: number`

response:

```json
{
  "items": [
    {
      "id": 1,
      "name": "playlist",
      "user_name": "owner",
      "data": "1",
      "preview_clips": [
        { "title": "t", "service": "Netflix", "user": "u" }
      ]
    }
  ],
  "nextCursor": 2
}
```

注意:

- UI 側 `playlist.tsx` は `preview_clips` を使っていない
- `cursor` は `id` だが `orderBy` は `updatedAt desc`

### `GET /api/search/playlists`

用途:

- プレイリスト検索

query:

- `q?: string`
- `user?: string` 実装上は `userId` として使われる
- `cursor?: number`

response:

```json
{
  "items": [
    {
      "id": 1,
      "name": "playlist",
      "user_name": "owner",
      "data": "1"
    }
  ],
  "nextCursor": 2
}
```

### `GET /api/playlists/me`

用途:

- `/playlists` の一覧

auth:

- 必須

response:

```json
{
  "items": [
    {
      "id": 1,
      "name": "playlist",
      "user_name": "owner",
      "data": "1",
      "icon": "Netflix"
    }
  ],
  "nextCursor": null
}
```

### `POST /api/playlists`

用途:

- プレイリスト新規作成

auth:

- 必須

request body:

```json
{ "name": "My Playlist" }
```

実装上、client は `{ name, userId }` を送ることがあるが、server は `name` しか読まない。

response:

- 作成された raw `Playlist`

### `GET /api/playlists/user/[userId]`

用途:

- モーダルで既存プレイリスト候補を読む

auth:

- 不要

response:

- raw `Playlist[]`

### `POST /api/playlists/[playlistId]/add`

用途:

- playlist へ clip を追加

request body:

```json
{ "clipId": 123 }
```

response:

```json
{
  "ok": true,
  "added": {
    "id": 10,
    "playlistId": 1,
    "clipId": 123,
    "order": 4
  }
}
```

特徴:

- `PlaylistClip.order` を transaction で `_max.order + 1` から採番
- auth / owner check は無い

### `GET /api/playlists/[playlistId]/play`

用途:

- 再生キュー生成

response:

```json
{
  "playlistId": "1",
  "name": "playlist",
  "clips": [
    {
      "id": 123,
      "clipname": "foo",
      "title": "bar",
      "service": "Netflix",
      "Subtitles": "ep",
      "url": "/watch/...",
      "startTime": 10,
      "endTime": 20,
      "order": 0
    }
  ]
}
```

### `POST /api/playlists/[playlistId]/reorder`

用途:

- DND 並び替え保存

auth:

- 必須

request body:

```json
[
  { "id": 11, "order": 0 },
  { "id": 12, "order": 1 }
]
```

ここでの `id` は `PlaylistClip.id`。

response:

- `"OK"` string body

### `DELETE /api/playlists/[playlistId]/clips/[playlistClipId]`

用途:

- プレイリストから 1 件削除

auth:

- 不要

response:

- body なし, `200`

## Secondary / legacy / integration APIs

これらは current UI からの参照が repo 内で未確認または弱い。

### `POST /api/receive`

用途:

- 外部クライアントから clip 保存

request body:

```json
{
  "clipName": "scene name",
  "user": "user name",
  "service": "Netflix",
  "StartTime": 12.3,
  "EndTime": 45.6,
  "URL": "/watch/xxx",
  "title": "episode title",
  "epnumber": "episode text"
}
```

response:

```json
{
  "message": "保存完了",
  "result": Clip
}
```

注意:

- request body は `StartTime` / `EndTime` / `URL`
- DB 保存先は `startTime` / `endTime` / `url`

### `GET /api/redirectWithCookie/[id]`

用途:

- clip 取得
- Cookie 設定
- 外部 URL へ redirect

response:

- JSON ではない
- redirect response

service 別処理:

- `clip.service === "Netflix"` のとき `https://www.netflix.com${clip.url}?t=${floor(startTime)}`
- それ以外は `clip.url` をそのまま redirect

### `GET /api/fetchAll`

response:

```json
{ "allReceivedData": Clip[] }
```

### `GET /api/fetchClip?id=123`

response:

- raw `Clip`

### `POST /api/nextClip`

request body:

```json
{
  "platform": "Netflix",
  "currentClipId": 123,
  "userId": "optional"
}
```

response:

- ランダムな raw `Clip`

注意:

- `currentClipId`, `userId` は現在ロジックで使っていない

### `GET /api/random10`

response:

```json
{ "allReceivedData": Clip[] }
```

注意:

- コメントでは 20 件だが実装は 10 件

# Data Flow Deep Dive

## 1. Home page load

1. `src/app/page.js` が server で `auth()` を呼ぶ
2. `userId = session?.user?.id ?? null` を作る
3. `ClipList clipApiUrl="/api/clips/chunk"` を描画
4. `PlayList PlayList_Data_Url="/api/playlists/all"` を描画
5. `ClipList.useEffect([clipApiUrl])` が state を初期化して `fetchChunk(null)` を呼ぶ
6. `fetchChunk` が `/api/clips/chunk` を fetch し、`cache` に連結する
7. `visibleItems = cache.slice(visibleIndex, visibleIndex + 10)` を描画する
8. 描画後 `clipListElementsRendered` event を dispatch する
9. `PlayListCluster` も同様に `/api/playlists/all` を fetch して描画する

重要な変数名:

- `ClipList.cache`
- `ClipList.cursor`
- `ClipList.visibleIndex`
- `PlayListCluster.cache`
- `PlayListCluster.cursor`

## 2. Search flow

1. `HeadSearch.handleSearch()` が `searchText.trim()` を `q` にする
2. `router.push("/search?q=...")`
3. `src/app/(site_data)/search/page.js` が `searchParams.q` を読む
4. `ClipList` に `/api/search?q=...`
5. `PlayList` に `/api/search/playlists?q=...`
6. あとは home と同じ一覧コンポーネントで描画

補足:

- URL 変化検知ロジックや `MutationObserver` は repo 内に見当たらない
- 検索は Next.js ルーティングによるページ遷移で実現している

## 3. Add clip to playlist flow

1. `Clip` コンポーネントの `+` ボタンを押す
2. `setIsOpen(true)` で modal を開く
3. `_components/PlaylistModal.useEffect([isOpen, userId])` が `/api/playlists/user/${userId}` を fetch
4. ユーザーが新規作成なら `createPlaylist()`
5. `POST /api/playlists` で playlist 作成
6. 返却された `playlist.id` を使って `POST /api/playlists/${playlist.id}/add`
7. `onClose()`
8. `router.push("/playlists/[id]")`

既存プレイリスト追加なら:

1. `addToPlaylist(playlistId)`
2. `POST /api/playlists/${playlistId}/add`
3. `onClose()`
4. `router.push("/playlists/[id]")`

`base/playlist/PlaylistModal.tsx` の方はこの後 `location.reload()` も行う。現在 `clipData.js` が使うのは `_components` 版。

## 4. Playlist detail load and edit flow

1. server page `playlists/[playlistId]/page.tsx` が playlist と current `userId` を取得
2. `PlaylistView` が `const isOwner = userId === playlist.userId` を計算
3. `const initialItems = useMemo(() => playlist.clips, [playlist.id])`
4. `const [items, setItems] = useState(initialItems)`
5. owner のときだけ DND `sensors` を有効化
6. ドラッグ終了で `handleDragEnd`
7. `arrayMove(items, oldIndex, newIndex)`
8. optimistic に `setItems(newOrder)`
9. `POST /api/playlists/${playlist.id}/reorder`
10. 失敗時は `setItems(items)` に戻す

注意:

- rollback は closure 上の `items` に依存する
- playlist prop が変わっても `useState(initialItems)` は再初期化されない

## 5. Playlist play flow

1. `PlaylistView` の再生ボタンを押す
2. `GET /api/playlists/${playlist.id}/play`
3. `const data = await res.json()`
4. `localStorage.setItem("playQueue", JSON.stringify(data.clips))`
5. `window.postMessage({ type: "PLAY_PLAYLIST_START" })`

repo 内で確認できるのはここまで。受信側や実再生ロジックは未確認。

## 6. Clip open flow

1. `Clip.handleClick()` が呼ばれる
2. Cookie `name/title/username/starttime/endtime/url` を書く
3. `window.dispatchEvent(new CustomEvent("clipSelected", { detail }))`
4. `service` に応じて URL を生成
5. `window.open()` で別タブ遷移

service 分岐:

- `"Netflix"` -> `https://www.netflix.com${url}`
- `"prime"` -> `https://www.amazon.co.jp/primevideo${url}`

値の揺れがあるので注意:

- `clipData.js` は `"prime"` 小文字
- sample JSON は `"netflix"` 小文字
- `redirectWithCookie/[id]` は `"Netflix"` 大文字だけ特別扱い

## 7. Intended redirect flow via server route

推定される意図:

1. `/clipAppRouter/[id]` に入る
2. server route が Cookie をセットする API へ redirect
3. API が clip を読んで外部 URL に redirect

しかし実装上は:

- `clipAppRouter/[id]/page.js` は `/api/redirectWithCookie?id=${id}` に redirect
- 実際の route file は `/api/redirectWithCookie/[id]`

現状は不整合で、意図通りに動く保証がない。

# State Management

## What state exists where

| State location | Actual keys / vars | Used by | Purpose |
|---|---|---|---|
| Server session | `session.user.id` | `layout.tsx`, page files, playlist APIs | current user identification |
| DB | `Clip`, `Playlist`, `PlaylistClip`, `User`, `Account`, `Session` | all APIs | persistent truth |
| React local state | `searchText`, `cache`, `cursor`, `visibleIndex`, `loading`, `error`, `name`, `playlists`, `items`, `mounted`, `isOpen` | client components | view state / async state |
| `useRef` | `didFetchRef` | `clipCluster.tsx`, `playlist.tsx` | StrictMode 二重 fetch 抑止 |
| Cookie | `name`, `title`, `username`, `starttime`, `endtime`, `url` | `clipData.js`, `redirectWithCookie/[id]` | external handoff 用の一時データ |
| `localStorage` | `playQueue` | `PlaylistView.tsx` | 再生キュー handoff |
| Browser events | `clipSelected`, `clipListElementsRendered`, `PLAY_PLAYLIST_START` | `clipData.js`, `clipCluster.tsx`, `PlaylistView.tsx` | 外部または別コンテキスト通知 |

## What is NOT present

repo 内で未確認:

- `chrome.storage`
- `sessionStorage`
- Redux / Zustand / Jotai 等の global state library
- SWR の利用
- `MutationObserver`
- URL 変更監視 (`popstate`, `hashchange`, custom history patch)
- repo 内 listener for `clipSelected`
- repo 内 listener for `clipListElementsRendered`
- repo 内 listener for `PLAY_PLAYLIST_START`

つまり state 管理は以下に分かれる:

- server truth: Prisma DB
- auth truth: NextAuth session / JWT cookie
- UI truth: React local state
- external bridge: Cookie / `localStorage` / browser events

# Configuration

## Environment variables

`Example.env.local`:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL`

観測:

- `.env.local` は存在するが中身は未確認
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` は `src/auth.ts` で直接参照
- `NEXTAUTH_URL` は `src/auth.ts` の `isProd` 判定に使う
- `AUTH_SECRET` はコード上の明示参照は無いが NextAuth の慣例設定として必要な可能性が高い

## Build / Run

```bash
npm run dev
npm run build
npm run start
```

Prisma schema を変える場合:

```bash
npx prisma migrate dev
```

## Runtime caveats

- 認証 cookie と clip 情報 cookie は別物
- auth cookie は `httpOnly`
- clip handoff cookie は client JS で書いている
- `secure` cookie の local 挙動はブラウザ依存になりやすい

# Important Conventions

## 1. `(protected)` is naming only

- URL segment ではない
- 認証や認可を自動で強制しない
- middleware も protected layout も見当たらない

## 2. `base/` is component storage inside `app/`

- `src/app/base` は route というより UI モジュール置き場
- `_components` は private folder 扱い
- ただし `app` 配下にあるため、route と component が同じ木に混在している

## 3. API response shapes are not unified

具体例:

- `/api/playlists` -> raw `Playlist[]` or raw `Playlist`
- `/api/playlists/me` -> `{ items, nextCursor }`
- `/api/playlists/user/[userId]` -> raw `Playlist[]`
- `/api/playlists/[playlistId]/play` -> `{ playlistId, name, clips }`
- `/api/fetchAll` -> `{ allReceivedData: Clip[] }`

「playlist 系 API だから同じ shape」と思わないこと。

## 4. Page components pass API URLs as strings

`ClipList` と `PlayListCluster` は URL を props でもらう。

例:

- `/` -> `"/api/clips/chunk"` と `"/api/playlists/all"`
- `/search` -> `"/api/search?q=..."`
- `/my_video` -> `"api/search?user=yabuki"`

この設計のため、page 側の URL 文字列変更で表示機能が変わる。

## 5. Full reloads still exist

以下は Next 的に洗練されていないが現行挙動の一部:

- `window.location.pathname = value.link`
- `window.location.href = "/registration"`
- `location.reload()`

変更時は client routing 前提で書き換えたくなるが、現状の副作用を先に把握すること。

# Editing Guidelines for LLMs

## Safe change areas

比較的安全:

- 文言変更
- README / コメント整理
- 未使用ファイルの精査と整理案の提示
- ダミーページ (`account`, `registration`) の明確な改善
- API shape を壊さない UI 内部の見た目修正

## High-risk areas

触る前に必ず関連一式を読むこと:

### Auth changes

読む:

- `src/auth.ts`
- `src/app/layout.tsx`
- `src/providers/session-provider.tsx`
- `src/app/base/_components/headSearch/headSearch.tsx`

確認ポイント:

- `session.user.id` が維持されるか
- cookie 名/属性が変わらないか
- external cookie access 前提を壊さないか

### Playlist API changes

読む:

- `src/app/api/playlists/route.ts`
- `src/app/api/playlists/me/route.ts`
- `src/app/api/playlists/all/route.ts`
- `src/app/api/playlists/[playlistId]/add/route.ts`
- `src/app/api/playlists/[playlistId]/reorder/route.ts`
- `src/app/api/playlists/[playlistId]/clips/[playlistClipId]/route.ts`
- `src/app/base/_components/PlaylistModal.tsx`
- `src/app/base/playlist/playlist.tsx`
- `src/app/(site_data)/(protected)/playlists/[playlistId]/PlaylistView.tsx`

確認ポイント:

- `PlaylistClip.id` と `Clip.id` を取り違えていないか
- `PlayListCluster` が期待する `{ items, nextCursor }` を壊していないか
- owner check を UI だけでなく server でも行っているか

### Clip open / external handoff changes

読む:

- `src/app/base/clip/clipData.js`
- `src/app/api/redirectWithCookie/[id]/route.js`
- `src/app/(site_data)/clipAppRouter/[id]/page.js`
- `src/app/api/receive/route.js`

確認ポイント:

- Cookie キー名が維持されるか
- service 名の比較条件を壊していないか
- 外部 listener が期待する event 名を変えていないか

## Rules of thumb before editing

1. まず「どの page がどの API URL を props で渡しているか」を確認する
2. 次に「その API が返す shape」を確認する
3. 次に「その shape を受ける component 内の prop 名」を確認する
4. 副作用があるなら Cookie / localStorage / event 名まで確認する
5. repo 内 listener が無い event は、外部依存の可能性を前提に扱う

## If you refactor

- `clipName` と `clipname` の統一は一括対応で行う
- `service` の値表記統一も同時に行う
- API shape 統一は current UI の適合レイヤーを用意してから行う
- `location.reload()` を外すなら、代替の再取得/再描画手段を一緒に入れる

# Risky / Fragile Areas

## 1. Auth and authorization are inconsistent

server で owner check しているのは主に `reorder` のみ。

- `/api/playlists/[playlistId]/reorder` -> auth + owner check あり
- `/api/playlists/[playlistId]/add` -> auth なし
- `/api/playlists/[playlistId]/clips/[playlistClipId]` -> auth なし
- `/api/playlists/user/[userId]` -> auth なし
- `/api/playlists/[playlistId]/play` -> auth なし

UI 上の「所有者だけ見える」は防御ではない。

## 2. Cursor pagination is structurally unsafe

不一致:

- `/api/clips/chunk`: cursor は `id`, order は `createdAt desc`
- `/api/playlists/all`: cursor は `id`, order は `updatedAt desc`

加えて:

- `/api/clips/chunk` は返却前に shuffle する

重複・欠落・説明困難な順序になりやすい。

## 3. Value naming drift

同じ意味の値に複数表記がある:

- `clipName` / `clipname`
- `epnumber` / `Subtitles`
- `url` / `URL`
- `startTime` / `StartTime`
- `endTime` / `EndTime`
- `user` / `user_name`
- `id` / `Id`
- `Netflix` / `netflix`
- `Prime` / `prime`

## 4. Current UI depends on side effects

- clip open は Cookie 書き込み前提
- playlist play は `localStorage.playQueue` と `PLAY_PLAYLIST_START` 前提
- 削除/追加の一部は `location.reload()` 前提

この副作用を消すと、repo 外の連携が壊れても検出しにくい。

## 5. Route mismatch and dead code suspicion

- `clipAppRouter/[id]` -> redirect 先 path が API route 定義と一致しない
- `api/playlists/[playlistId]/route.ts` の `DELETE` は `playlistClipId` を読もうとするが path に存在しない

# Anti-Patterns / Smells

## 1. Same concept, different APIs, different shapes

playlist 一覧だけで少なくとも以下がある:

- raw `Playlist[]`
- `{ items, nextCursor }`
- `{ allReceivedData: ... }`

これは LLM が最も誤編集しやすいポイント。

## 2. Duplicated modal implementation

- `src/app/base/_components/PlaylistModal.tsx`
- `src/app/base/playlist/PlaylistModal.tsx`

差分が小さいのに完全重複しており、片方だけ直して壊す危険がある。

## 3. Server/client boundary workarounds

`playlists/[playlistId]/page.tsx` の:

```ts
const serialized = JSON.parse(JSON.stringify(playlist));
```

動くが、型安全でも意味安全でもない。Prisma の返り値を client に渡すための雑な直列化。

## 4. Unused or half-connected files

repo 内参照未確認または薄い:

- `src/app/ext-auth/`
- `src/app/providers.tsx`
- `src/app/page.module.css`
- `src/app/styles.css`
- `src/app/base/_components/sidebar/sidebarIcon.js`
- `src/app/base/_components/sidebar/page.js`
- `src/app/(site_data)/(protected)/playlists/[playlistId]/PlaylistItem.tsx`
- `src/app/api/playlists/all/client/route.ts`

## 5. Incomplete pages presented as real pages

- `/account` はダミー
- `/registration` は送信先無し
- `/login` のメール/パスワード欄は仮
- `/my_video` は user 固定

## 6. Inconsistent fetch style

- `clipCluster.tsx` は `res.text()` -> `JSON.parse`
- `playlist.tsx` は `res.json()`

同じような一覧 fetch でも実装が揃っていない。

# Known Issues / TODO

## Confirmed

- `README.md` は create-next-app 初期内容のまま
- テストコードは見当たらない
- custom middleware は見当たらない
- `public/test_data/*.json` は現行コードから参照未確認
- `public/icontest/Icon.png` は `sidebarIcon.js` からのみ参照
- `src/app/(site_data)/(protected)/dashboard/page.tsx` は開発用 dump ページ

## Strongly suspected

- `clipAppRouter/[id]` は path mismatch で壊れている可能性が高い
- 外部連携の listener が repo 外にある
- `service` 値の大小文字揺れで一部遷移条件がズレる可能性がある

# Recommended Reading Order for LLMs

## Minimal safe path

1. `package.json`
2. `Example.env.local`
3. `prisma/schema.prisma`
4. `src/auth.ts`
5. `src/lib/prisma.ts`
6. `src/app/layout.tsx`
7. `src/app/base/_components/headSearch/headSearch.tsx`
8. `src/app/page.js`
9. `src/app/base/clip/clipCluster.tsx`
10. `src/app/base/clip/clipData.js`
11. `src/app/base/playlist/playlist.tsx`
12. `src/app/base/_components/PlaylistModal.tsx`
13. `src/app/api/playlists/route.ts`
14. `src/app/api/playlists/all/route.ts`
15. `src/app/api/playlists/[playlistId]/add/route.ts`
16. `src/app/(site_data)/(protected)/playlists/[playlistId]/page.tsx`
17. `src/app/(site_data)/(protected)/playlists/[playlistId]/PlaylistView.tsx`
18. `src/app/(site_data)/(protected)/playlists/[playlistId]/SortableClipItem.tsx`
19. `src/app/api/playlists/[playlistId]/play/route.ts`
20. `src/app/api/receive/route.js`
21. `src/app/api/redirectWithCookie/[id]/route.js`
22. `src/app/(site_data)/clipAppRouter/[id]/page.js`

## If editing only one feature

### Search

- `headSearch.tsx`
- `search/page.js`
- `api/search/route.ts`
- `api/search/playlists/route.ts`

### Playlist CRUD

- `_components/PlaylistModal.tsx`
- `api/playlists/route.ts`
- `api/playlists/[playlistId]/add/route.ts`
- `playlists/[playlistId]/page.tsx`
- `PlaylistView.tsx`
- `SortableClipItem.tsx`

### External handoff

- `clipData.js`
- `api/redirectWithCookie/[id]/route.js`
- `api/receive/route.js`
- `clipAppRouter/[id]/page.js`

### Auth

- `auth.ts`
- `layout.tsx`
- `session-provider.tsx`
- `headSearch.tsx`
- `api/auth/[...nextauth]/route.js`
