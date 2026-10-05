// biome-ignore-all lint/security/noSecrets: These are public sha256 checksums of committed migration files.
import assert from "node:assert/strict";
import { test } from "node:test";

import { localMigrationChecksums } from "../../scripts/lib/migration-checksums.mjs";

/**
 * 本番に適用済みの migration の checksum（= migration.sql の sha256。
 * `_prisma_migrations.checksum` に記録される値）。
 *
 * 本番の記録との突き合わせは `npm run codex:db` が行う。ここは DB の無い CI でも、
 * 適用済みと分かっているファイルの書き換えを止めるための固定値。新しい migration を
 * 本番へ適用したら、codex:db で一致を確かめてからここへ足す。
 * 「一覧に無い＝未適用」とは限らない（#74 はそう思い込んで checksum を割った）。
 */
const APPLIED_MIGRATION_CHECKSUMS = [
  [
    "20260430010000_init",
    "8c5249c6a3221f6c1a168fdd87848b712c79127e6aef67b3143689dfa147b15a",
  ],
  [
    "20260705000000_add_linked_extension_expires_at",
    "46de0e942185012899f6111dfb9e8df2ae1a2ee4f00f1fd643e6106894758b2f",
  ],
  [
    "20260726000000_add_clip_comments",
    "d0fe6206ad65f859cd646702b084b44ac44e872fd5e81c7155c9f0225a381c07",
  ],
  [
    "20260806000000_add_clip_comment_at_ms",
    "e6ee0ebd061d0fb4ac15989d66ad2e353e2cd3c45f036aa1a69a89428f13617e",
  ],
  [
    "20260806010000_add_clip_comment_reports",
    "e7930af2dbd63780ff238f7ead93449e7a686351bbfec7a34618d2343e3f2bc8",
  ],
  [
    "20260809000000_harden_clip_comments",
    "82d8a2473580425df2308858cb85f521409ce90640e27c92d1c3001a1f18b7ec",
  ],
  // ブランチのマージより先に本番へ適用された（2026-09-05）。
  [
    "20260905000000_playlist_clip_order",
    "7f3109de9a47fc93430f76d51dc83507050ec3a6104d29dd16a385c1c5ea7f24",
  ],
];

test("already-applied migrations retain their recorded checksums", () => {
  const local = localMigrationChecksums("prisma/migrations");
  for (const [name, expected] of APPLIED_MIGRATION_CHECKSUMS) {
    assert.equal(
      local.get(name),
      expected,
      `${name} は適用済みマイグレーション。本文を編集すると適用済み環境と checksum が` +
        `ずれる。変更を取り消し、必要な DDL は新しいマイグレーションに書くこと。`,
    );
  }
});
