# prisma-augment の使い方

## 1. これは何をするツールか

`scripts/prisma-augment.ts` は Prisma schema (`prisma/schema.prisma`) に書いた宣言的コメント:

- `/// @@partialIndex([...], ...)`
- `/// @@partialUnique([...], ...)`
- `/// @raw.sql ...`

を読み取り、`prisma/migrations/<latest>/migration.sql` の末尾に **自動生成 SQL だけ** をまとめて差し込むスクリプトです。すでに吐き出した `GENERATED_EXTENSIONS` / `GENERATED_AUGMENT` ブロックと差分比較をし、必要な `CREATE INDEX` / `DROP INDEX` / 任意の SQL を追加もしくは置換します。

## 2. 前提条件

- Node.js 24.x（`package.json` の engines に準拠）
- `npm install` 済み（`@prisma/internals`, `tsx` などが必要）
- 直近のマイグレーションが存在すること
  ```bash
  npx prisma migrate dev --create-only
  ```
- `.env` などで `DATABASE_URL` が読める状態  
  → クエリ文字列 `?schema=` があればそこを優先、無ければ `public` スキーマ扱いになります。

## 3. Prisma schema への記述方法

### 3.1 部分インデックス `@@partialIndex`

```prisma
model Clip {
  id        String   @id @default(cuid())
  title     String
  accountId String
  deletedAt DateTime? @map("deleted_at")

  /// @@partialIndex([accountId, title], name: "clip_account_title_idx")
  /// WHERE 句を明示しなければ deleted_at があれば `deleted_at IS NULL` を自動付与
}
```

- シグネチャ: `/// @@partialIndex([fieldA, fieldB], name: "...", where: "...", schema: "...")`
- `name` 省略時は `table_field_field_idx` 形式
- `where` 省略時に該当モデルへ `deleted_at` カラムがあると `deleted_at IS NULL` を自動付加
- `schema` 省略時は `DATABASE_URL` 内の `?schema=...` または `public`

### 3.2 部分ユニーク `@@partialUnique`

```prisma
model Favorite {
  id        String   @id
  userId    String
  clipId    String
  deletedAt DateTime?
  /// @@partialUnique([userId, clipId], name: "favorite_unique_active")
}
```

- 挙動は `partialIndex` と同じで `CREATE UNIQUE INDEX ... WHERE ...` を生成します。

### 3.3 任意 SQL `@raw.sql`

```prisma
/// @raw.sql CREATE EXTENSION IF NOT EXISTS "pg_trgm";
/// テキストの改行も `/// ` で繋げば OK
/// DO $$
/// BEGIN
///   RAISE NOTICE 'hello';
/// END;
/// $$;
```

- ブロックごとに 1 つ以上の SQL を記述可能
- `DO $$ ... $$;` もサポート
- `kind: raw` として `GENERATED_AUGMENT` ブロックにまとめて出力
- schema から削除した場合は自動 DROP されないので、明示的に逆操作 SQL を書く

## 4. 実行方法

```bash
# 通常実行（最新 migration.sql を上書き）
npx tsx scripts/prisma-augment.ts

# ドライラン（差分の表示のみ）
npx tsx scripts/prisma-augment.ts --check
# または環境変数
DRY_RUN=1 npx tsx scripts/prisma-augment.ts

# デバッグログ
DEBUG_AUGMENT=1 npx tsx scripts/prisma-augment.ts
```

実行すると、`prisma/migrations/<最新>/migration.sql` に以下のようなブロックが追加・置換されます。

```sql
-- GENERATED_EXTENSIONS_BEGIN 123abc456def
-- 以下は schema.prisma の注釈から自動生成されています (extensions)
-- kind: raw
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- GENERATED_EXTENSIONS_END 123abc456def

-- GENERATED_AUGMENT_BEGIN fedcba654321
-- 以下は schema.prisma の注釈から自動生成されています (partialIndex/partialUnique/raw/drop)
-- kind: partialIndex
CREATE INDEX clip_account_title_idx
  ON "public"."Clip"("account_id","title")
  WHERE deleted_at IS NULL;

-- kind: drop
DROP INDEX IF EXISTS "favorite_unique_active";
-- GENERATED_AUGMENT_END fedcba654321
```

- `EXTENSIONS` ブロックは migration の先頭に強制配置
- `AUGMENT` ブロックは末尾（既存があれば置換、なければ append）
- 同じ SQL はハッシュ比較で履歴から自動スキップ
- 既存 `CREATE INDEX` が削除された場合は `DROP INDEX IF EXISTS ...` を自動生成
- 同一 migration 内で `ALTER TABLE ... DROP COLUMN ...` と衝突する `ADD COLUMN` があれば自動的にスキップ

## 5. 典型的なワークフロー

1. Prisma モデルを追加・変更し、`@map`/`@@map` も含めて schema を整える
2. 必要に応じて `/// @@partialIndex`, `/// @@partialUnique`, `/// @raw.sql` コメントを追加
3. マイグレーションの骨組みを作成  
   `npx prisma migrate dev --create-only --name add_clip_indices`
4. `npx tsx scripts/prisma-augment.ts` を実行
5. `prisma/migrations/<stamp>_<name>/migration.sql` を確認  
   - 自動生成部分は `GENERATED_*` ブロック
   - 手書きの SQL を混在させたい場合はブロック外に追記
6. 問題なければテスト・レビュー・コミット

## 6. トラブルシュート

| 症状 | 対処 |
| --- | --- |
| `prisma/migrations がありません` で失敗する | 先に `npx prisma migrate dev --create-only` で空の migration を作る |
| 期待する SQL が出ない | `DEBUG_AUGMENT=1` で詳細ログ、`schema.prisma` のコメント位置やモデル名を確認 |
| 以前の @raw.sql が出力されなくなった警告 | 自動 DROP はされません。不要なら手動で除去する SQL を別途書く |
| `DROP INDEX` が勝手に入る | 過去の GENERATED_* ブロックで作ったインデックスが現在の schema に無いため。必要なら再度 `@@partialIndex` を追加し直す |
| 生成ブロックを手動編集したい | 変更は次回実行で上書きされるため、手書きはブロック外に入れる |

---
