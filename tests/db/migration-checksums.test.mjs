import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  compareMigrationChecksums,
  compareWithRegistry,
  localMigrationChecksums,
} from "../../scripts/lib/migration-checksums.mjs";

const applied = { finishedAt: new Date(), rolledBackAt: null };

test("an applied migration whose file changed is reported as mismatched", () => {
  const local = new Map([
    ["001_init", "aaa"],
    ["002_feature", "bbb-edited"],
  ]);
  const result = compareMigrationChecksums(
    [
      { name: "001_init", checksum: "aaa", ...applied },
      { name: "002_feature", checksum: "bbb", ...applied },
    ],
    local,
  );
  assert.deepEqual(result.mismatched, [
    { name: "002_feature", recorded: "bbb", local: "bbb-edited" },
  ]);
  assert.deepEqual(result.dbOnly, []);
  assert.deepEqual(result.pending, []);
});

test("DB-only and pending migrations are reported separately from mismatches", () => {
  const result = compareMigrationChecksums(
    [
      { name: "001_init", checksum: "aaa", ...applied },
      { name: "003_other_branch", checksum: "ccc", ...applied },
    ],
    new Map([
      ["001_init", "aaa"],
      ["002_new", "ddd"],
    ]),
  );
  assert.deepEqual(result, {
    mismatched: [],
    dbOnly: ["003_other_branch"],
    pending: ["002_new"],
  });
});

test("failed or rolled-back rows are not treated as applied", () => {
  const result = compareMigrationChecksums(
    [
      {
        name: "001_init",
        checksum: "old",
        finishedAt: null,
        rolledBackAt: null,
      },
      {
        name: "002_feature",
        checksum: "old",
        finishedAt: new Date(),
        rolledBackAt: new Date(),
      },
    ],
    new Map([
      ["001_init", "new"],
      ["002_feature", "new"],
    ]),
  );
  assert.deepEqual(result, {
    mismatched: [],
    dbOnly: [],
    pending: ["001_init", "002_feature"],
  });
});

test("local checksums are the sha256 of each migration.sql, as Prisma records them", () => {
  const checksums = localMigrationChecksums("prisma/migrations");
  assert.ok(checksums.size > 0);
  const name = "20260430010000_init";
  assert.equal(
    checksums.get(name),
    createHash("sha256")
      .update(readFileSync(`prisma/migrations/${name}/migration.sql`))
      .digest("hex"),
  );
  // migration_lock.toml のようなファイルは対象にしない
  assert.ok([...checksums.keys()].every((key) => /^\d{14}_/.test(key)));
});

test("a migration recorded as pending but applied in the DB is reported with its checksum", () => {
  // #74: 本番では適用済みなのに「未適用」と信じられていた状態
  const result = compareWithRegistry(
    [
      { name: "001_init", checksum: "aaa", ...applied },
      { name: "002_harden", checksum: "bbb", ...applied },
      {
        name: "003_failed",
        checksum: "ccc",
        finishedAt: null,
        rolledBackAt: null,
      },
    ],
    {
      applied: { "001_init": "aaa", "004_missing": "ddd" },
      pending: ["002_harden", "003_failed"],
    },
  );
  assert.deepEqual(result, {
    pendingButApplied: [{ name: "002_harden", checksum: "bbb" }],
    appliedButNotInDb: ["004_missing"],
  });
});
