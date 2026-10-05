// biome-ignore-all lint/security/noSecrets: These are public sha256 checksums of committed migration files.

/**
 * migration の適用状態の記録。DB の無い CI（tests/db/applied-migrations.test.mjs）と、
 * DB に接続する codex:db（scripts/check-migration-checksums.mjs）の両方がここを見る。
 *
 * - APPLIED_MIGRATIONS: 本番に適用済み。値は本番の `_prisma_migrations.checksum`
 *   （= migration.sql の sha256）。CI はこの値とファイルの一致を検査し、適用済み
 *   ファイルの書き換えを止める。
 * - PENDING_MIGRATIONS: まだ本番に適用していない migration の名前。
 *
 * prisma/migrations の全ディレクトリは、どちらか一方に入っていなければならない
 * （CI が検査する）。新しい migration はまず PENDING に入れ、本番へ適用したら
 * codex:db が表示する checksum とともに APPLIED へ移す。分類を誤ったまま
 * 本番で適用済みになっていれば、codex:db が警告する（#74 はこの誤分類から起きた）。
 */
export const APPLIED_MIGRATIONS = {
  "20260430010000_init":
    "8c5249c6a3221f6c1a168fdd87848b712c79127e6aef67b3143689dfa147b15a",
  "20260705000000_add_linked_extension_expires_at":
    "46de0e942185012899f6111dfb9e8df2ae1a2ee4f00f1fd643e6106894758b2f",
  "20260726000000_add_clip_comments":
    "d0fe6206ad65f859cd646702b084b44ac44e872fd5e81c7155c9f0225a381c07",
  "20260806000000_add_clip_comment_at_ms":
    "e6ee0ebd061d0fb4ac15989d66ad2e353e2cd3c45f036aa1a69a89428f13617e",
  "20260806010000_add_clip_comment_reports":
    "e7930af2dbd63780ff238f7ead93449e7a686351bbfec7a34618d2343e3f2bc8",
  // 2026-08-21 に適用済み。#74 で「未適用」と思い込まれ、IF EXISTS を後付けされた。
  "20260809000000_harden_clip_comments":
    "82d8a2473580425df2308858cb85f521409ce90640e27c92d1c3001a1f18b7ec",
  // ブランチのマージより先に本番へ適用された（2026-09-05）。
  "20260905000000_playlist_clip_order":
    "7f3109de9a47fc93430f76d51dc83507050ec3a6104d29dd16a385c1c5ea7f24",
};

export const PENDING_MIGRATIONS = [];
