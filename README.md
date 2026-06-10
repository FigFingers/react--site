# FigFingers React Site

Next.js App Router application for FigFingers. The current branch uses a Prisma/PostgreSQL backend with:

- NextAuth v5
- Prisma 7
- `src/server` service/repository layering
- `prisma-augment` for partial indexes, partial unique indexes, and raw SQL
- extension connection APIs under `/api/extension/*`

## Setup

1. Install dependencies.
   `npm install`
2. Prepare env files.
   Copy `Example.env.local` into `.env.local` and fill in:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `NEXTAUTH_URL`
   - `CLIP_API_ALLOWED_ORIGINS`
3. Start the app.
   `npm run dev`

## 開発コマンドと SSH トンネル

`npm run dev` は起動前に `scripts/start-tunnel.mjs` を実行し、SSH ポートフォワーディングでリモート PostgreSQL に接続する。

```
npm run dev      # SSHトンネル → lint → next dev（リモートDB用）
npm run dev:local  # next dev のみ（ローカルDB用）
```

### ローカル DB を使う場合

`npm run dev:local` を使う。トンネルスクリプトを完全にスキップする。

### `npm run dev` 実行時のトンネル起動判定

| 状況 | 動作 |
|---|---|
| `.env.local` がない | スキップして正常起動 |
| `DB_SSH_USER` / `DB_SSH_PORT` が未設定 | スキップして正常起動 |
| 対象ポート（デフォルト 5432）が既に開いている | スキップして正常起動（ローカル DB と判断） |
| SSH 接続が 2 秒以内に切れる | エラーで `dev` 起動失敗 |
| SSH 接続成功（2 秒以上維持） | トンネル確立、バックグラウンドで継続 |

`.env.local` で設定する SSH 関連の変数：

```
DB_SSH_USER=user@hostname
DB_SSH_PORT=22
DB_TUNNEL_LOCAL_PORT=5432    # 省略時 5432
DB_TUNNEL_REMOTE_HOST=localhost  # 省略時 localhost
DB_TUNNEL_REMOTE_PORT=5432   # 省略時 5432
DB_SSH_KEY_PATH=~/.ssh/id_rsa  # 省略時 ~/.ssh/id_rsa
```

## Database

This repo expects PostgreSQL. The current migration history has been rebuilt into a single init migration:

- [prisma/migrations/20260430010000_init/migration.sql](/home/hiiro/repos/FigFingers/react--site/prisma/migrations/20260430010000_init/migration.sql:1)

For a fresh local database:

```bash
npx prisma migrate reset --force
```

## Prisma Augment Workflow

This project does not rely on plain `prisma migrate dev` alone. Partial indexes and partial unique indexes are generated from comments in [prisma/schema.prisma](/home/hiiro/repos/FigFingers/react--site/prisma/schema.prisma:1) by [scripts/prisma-augment.ts](/home/hiiro/repos/FigFingers/react--site/scripts/prisma-augment.ts:1).

When adding a new migration:

1. Edit `prisma/schema.prisma`
2. Create a skeleton migration
   `npx prisma migrate dev --create-only --name <name>`
3. Append augment-managed SQL
   `node --import tsx scripts/prisma-augment.ts`
4. Review the generated `migration.sql`
5. Apply it
   `npx prisma migrate dev`

If Prisma prompts you to create an extra migration after your intended migration has already been applied, stop and inspect the generated SQL before continuing. In this repo that usually means Prisma is trying to convert augment-managed partial indexes into normal diff output.

## Extension APIs

The extension connection flow is implemented on top of the DB/API redesign.

- `GET /api/extension/session`
- `POST /api/extension/link-token`
- `POST /api/extension/link`
- `POST /api/extension/sync`

The backing tables are:

- `linked_extensions`
- `extension_link_tokens`
- `sync_receipts`

`linked_extensions` uses augment-managed active-only indexes:

- partial unique on `extension_instance_id` where `revoked_at IS NULL`
- partial index on `(user_id, last_seen_at)` where `revoked_at IS NULL`

## Auth API Policy

`/api/auth/*` is owned by Auth.js / NextAuth and is intentionally not modeled as a v1 application API path.

- Keep the implementation at `src/app/api/auth/[...nextauth]/route.js`
- Do not move Auth.js callback/session/provider routes under `/api/v1`
- Represent auth in `openapi/v1.yaml` with `securitySchemes` and per-operation `security`
- Document only application-owned auth-adjacent APIs such as `/me`

## Legacy Ingest

`POST /api/receive` is still present as a legacy ingest path for old clients.

- It now requires an authenticated session
- It now checks allowed origins
- It converts legacy clip payloads into the current `clips` schema
- It is frozen as a compatibility path and should not receive new extension features

The intended long-term write path for extensions is `/api/extension/*`, not `/api/receive`.
Once the browser extension has been migrated to the new handshake, `/api/receive` should be removed.
