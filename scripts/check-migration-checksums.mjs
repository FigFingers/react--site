// biome-ignore-all lint/security/noSecrets: Japanese operator messages are false positives.
// DATABASE_URL の DB に記録された適用済み migration の checksum と、
// prisma/migrations の migration.sql を突き合わせる。読み取り専用のトランザクションで
// `_prisma_migrations` を読むだけで、DB には書き込まない。
//
// 使い方: node scripts/check-migration-checksums.mjs（codex:db から呼ばれる）
import process from "node:process";
import pg from "pg";

import {
  compareMigrationChecksums,
  localMigrationChecksums,
} from "./lib/migration-checksums.mjs";

const MIGRATIONS_DIR = "prisma/migrations";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();
let records;
try {
  await client.query("BEGIN READ ONLY");
  const result = await client.query(`
    SELECT
      migration_name AS name,
      checksum,
      finished_at AS "finishedAt",
      rolled_back_at AS "rolledBackAt"
    FROM _prisma_migrations
  `);
  records = result.rows;
  await client.query("COMMIT");
} finally {
  await client.end();
}

const localChecksums = localMigrationChecksums(MIGRATIONS_DIR);
const localMigrationCount = localChecksums.size;
const { mismatched, dbOnly, pending } = compareMigrationChecksums(
  records,
  localChecksums,
);

for (const name of pending) {
  console.log(`[checksum] 未適用: ${name}`);
}
for (const name of dbOnly) {
  console.warn(
    `[checksum] DB にだけある（手元に無い）: ${name} — 別ブランチの migration が先に適用されていないか確認すること`,
  );
}
for (const { name, recorded, local } of mismatched) {
  console.error(
    `[checksum] 適用済みの本文が記録と違う: ${name}\n` +
      `           記録 ${recorded}\n           手元 ${local}`,
  );
}

if (mismatched.length > 0) {
  console.error(
    "[checksum] 適用済みの migration.sql は編集しない。変更を取り消し、必要な DDL は新しい migration に書くこと。",
  );
  process.exit(1);
}
const comparedCount = localMigrationCount - pending.length;
console.log(
  `[checksum] 適用済みで手元にもある ${comparedCount} 本は、すべて記録と一致`,
);
