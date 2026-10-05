import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * prisma/migrations 配下の各 migration.sql の sha256。
 * Prisma が適用時に `_prisma_migrations.checksum` へ記録する値と同じ。
 */
export function localMigrationChecksums(migrationsDir) {
  const checksums = new Map();
  for (const entry of readdirSync(migrationsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sql = readFileSync(join(migrationsDir, entry.name, "migration.sql"));
    checksums.set(entry.name, createHash("sha256").update(sql).digest("hex"));
  }
  return checksums;
}

/**
 * DB に記録された適用済み migration と手元のファイルを突き合わせる。
 *
 * Prisma 7.4 の `migrate status` / `migrate deploy` は、適用済みファイルの本文が
 * 書き換わった（checksum だけが違う）ことを報告しない。気付くのは後で
 * `migrate dev` が reset を要求したときになるので、ここで先に見る。
 *
 * - mismatched: 適用済みなのに手元の本文が記録と違う（直すべきずれ）
 * - dbOnly: DB には適用済みだが手元に無い（別ブランチの migration が先に入った等）
 * - pending: 手元にあるが DB には未適用
 *
 * 失敗したまま（finished_at が無い）や取り消された（rolled_back_at がある）行は、
 * 適用済みとして扱わない。その状態は `migrate status` が報告する。
 */
export function compareMigrationChecksums(records, localChecksums) {
  const applied = new Set();
  const mismatched = [];
  const dbOnly = [];

  for (const record of records) {
    if (record.finishedAt == null || record.rolledBackAt != null) continue;
    applied.add(record.name);
    const local = localChecksums.get(record.name);
    if (local === undefined) {
      dbOnly.push(record.name);
    } else if (local !== record.checksum) {
      mismatched.push({ name: record.name, recorded: record.checksum, local });
    }
  }

  const pending = [...localChecksums.keys()].filter(
    (name) => !applied.has(name),
  );
  return {
    mismatched: mismatched.sort((a, b) => a.name.localeCompare(b.name)),
    dbOnly: [...new Set(dbOnly)].sort(),
    pending: pending.sort(),
  };
}
