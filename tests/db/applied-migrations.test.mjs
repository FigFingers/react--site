import assert from "node:assert/strict";
import { test } from "node:test";

import { localMigrationChecksums } from "../../scripts/lib/migration-checksums.mjs";
import {
  APPLIED_MIGRATIONS,
  PENDING_MIGRATIONS,
} from "../../scripts/lib/migration-registry.mjs";

// 分類と checksum の記録は scripts/lib/migration-registry.mjs にある。
// 本番の記録との突き合わせは codex:db が行い、ここは DB の無い CI 向けの検査。
const local = localMigrationChecksums("prisma/migrations");

test("already-applied migrations retain their recorded checksums", () => {
  for (const [name, expected] of Object.entries(APPLIED_MIGRATIONS)) {
    assert.equal(
      local.get(name),
      expected,
      `${name} は適用済みマイグレーション。本文を編集すると適用済み環境と checksum が` +
        `ずれる。変更を取り消し、必要な DDL は新しいマイグレーションに書くこと。`,
    );
  }
});

test("every migration is recorded as either applied or pending", () => {
  for (const name of local.keys()) {
    const applied = Object.hasOwn(APPLIED_MIGRATIONS, name);
    const pending = PENDING_MIGRATIONS.includes(name);
    assert.ok(
      applied !== pending,
      applied
        ? `${name} が APPLIED と PENDING の両方にある。どちらか一方にすること。`
        : `${name} が scripts/lib/migration-registry.mjs に無い。新しい migration なら ` +
            `PENDING_MIGRATIONS に足す。本番に適用済みかどうかは codex:db で確かめること。`,
    );
  }
});

test("recorded migrations all exist in prisma/migrations", () => {
  for (const name of [
    ...Object.keys(APPLIED_MIGRATIONS),
    ...PENDING_MIGRATIONS,
  ]) {
    assert.ok(local.has(name), `${name} は記録にあるがディレクトリが無い`);
  }
});
