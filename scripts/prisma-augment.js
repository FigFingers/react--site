// scripts/prisma-partials.js
// 宣言的 @@partialIndex / @@partialUnique と /// @raw.sql を解析し、
// 生成SQLを「過去生成分との差分のみ」最新 migration.sql に追記（または置換）する。
// - ドライラン: `--check` か環境変数 `DRY_RUN=1`
// - 履歴重複排除: 過去の GENERATED_(EXTENSIONS|AUGMENT|PARTIALS) ブロックから既出SQLを収集
// - 定義ベースのデデュープ: テーブル/列順/WHERE/UNIQUE が一致すれば、インデックス名が違っても重複扱い
// - 同一 migration 内の DROP/ADD 衝突を自動回避
//
// biome-ignore-all lint/suspicious/noConsole: cli script
// biome-ignore-all lint/security/noSecrets: not exist SecretStrings

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const SCHEMA = path.resolve("prisma/schema.prisma");
const MIGRATIONS_DIR = path.resolve("prisma/migrations");

const DEFAULT_SCHEMA = "public";
const ORDER = ["partialIndex", "partialUnique", "raw"]; // DROP はあとで dropStmts として allNews = [...news, ...dropStmts] に足されるため不記載

const DRY_RUN = process.argv.includes("--check") || process.env.DRY_RUN === "1";

const DEBUG = process.env.DEBUG_PARTIALS === "1";

const EXT_MARK = "GENERATED_EXTENSIONS";
const REST_MARK = "GENERATED_AUGMENT";

// ========== 共通ユーティリティ ==========
function makeBundle(mark, hash, body, label) {
  return (
    `\n-- ${mark}_BEGIN ${hash}\n` +
    `-- 以下は schema.prisma の注釈から自動生成されています (${label})\n` +
    body +
    `\n-- ${mark}_END ${hash}\n`
  );
}
function readSchema() {
  return fs.readFileSync(SCHEMA, "utf8");
}
function safeIdent(name) {
  return String(name || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase()
    .replace(/^_+/, "")
    .slice(0, 63);
}
function splitTopLevel(s) {
  const out = [];
  let cur = "";
  let q = null;
  for (let i = 0; i < (s || "").length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === q && s[i - 1] !== "\\") q = null;
      cur += ch;
    } else {
      if (ch === '"' || ch === "'") {
        q = ch;
        cur += ch;
      } else if (ch === ",") {
        out.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function parseOptions(s) {
  const opts = {};
  if (!s) return opts;
  for (const part of splitTopLevel(s)) {
    const m = part.match(/^\s*(\w+)\s*[:=]\s*(.+)\s*$/); // name="x" も name: "x" も許容
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim();
    const q = v.match(/^(['"])(.*)\1$/);
    if (q) v = q[2];
    if (v === "true") v = true;
    else if (v === "false") v = false;
    opts[k] = v;
  }
  return opts;
}
function normalizeTerminator(sql) {
  const t = String(sql || "").trim();
  if (/DO\s+\$\$[\s\S]*\$\$\s*;?\s*$/i.test(t))
    return t.replace(/\s*;?\s*$/, ";");
  return t.replace(/;?\s*$/, ";");
}
function normalizeForDedup(sql) {
  return String(sql || "")
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*;\s*$/, ";")
    .trim();
}
function splitStatements(text) {
  const out = [];
  let buf = "";
  let inDollar = false;
  let i = 0;
  const s = String(text || "");
  while (i < s.length) {
    if (!inDollar) {
      const head = s.slice(i).match(/^DO\s+\$\$/i);
      if (head) {
        buf += head[0];
        i += head[0].length;
        inDollar = true;
        continue;
      }
      const ch = s[i];
      if (ch === ";") {
        out.push(`${buf};`.trim());
        buf = "";
        i++;
        continue;
      }
      buf += ch;
      i++;
    } else {
      const tail = s.slice(i).match(/^\$\$\s*;/);
      if (tail) {
        buf += tail[0];
        out.push(buf.trim());
        buf = "";
        i += tail[0].length;
        inDollar = false;
        continue;
      }
      buf += s[i];
      i++;
    }
  }
  if (buf.trim()) out.push(buf.trim().replace(/;?$/, ";"));
  return out;
}

// ========== Prisma schema → 物理名マップ ==========
function buildModelMap(schemaText) {
  const lines = schemaText.split(/\r?\n/);
  const models = {}; // { Model: { table, fields: { logical -> physical } } }
  let cur = null;

  for (const raw of lines) {
    const line = raw.trimEnd();

    const mStart = line.match(/^\s*model\s+(\w+)\s*\{/);
    if (mStart) {
      cur = { name: mStart[1], table: null, fields: {} };
      models[cur.name] = cur;
      continue;
    }
    if (!cur) continue;

    if (/^\s*\}/.test(line)) {
      if (!cur.table) cur.table = cur.name;
      cur = null;
      continue;
    }

    const tmap = line.match(/@@map\(\s*"([^"]+)"\s*\)/);
    if (tmap) {
      cur.table = tmap[1];
      continue;
    }

    const fhead = line.match(/^\s*(\w+)\s+[^{\s][^\n]*$/);
    if (
      fhead &&
      !line.trimStart().startsWith("@@") &&
      !line.trimStart().startsWith("//")
    ) {
      const logical = fhead[1];
      if (!Object.hasOwn(cur.fields, logical)) {
        cur.fields[logical] = logical;
      }
      const mapm = line.match(/@map\(\s*"([^"]+)"\s*\)/);
      if (mapm) {
        cur.fields[logical] = mapm[1];
      }
    }
  }
  return models;
}

function loadHistoricalKeys() {
  const keys = new Set();
  if (!fs.existsSync(MIGRATIONS_DIR)) return keys;
  const dirs = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const blockRes = [
    /-- GENERATED_EXTENSIONS_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_EXTENSIONS_END [a-f0-9]{12}\b/gm,
    /-- GENERATED_AUGMENT_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_AUGMENT_END [a-f0-9]{12}\b/gm,
    /-- GENERATED_PARTIALS_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_PARTIALS_END [a-f0-9]{12}\b/gm,
  ];

  for (const d of dirs) {
    const p = path.join(MIGRATIONS_DIR, d, "migration.sql");
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, "utf8");

    for (const baseRe of blockRes) {
      const re = new RegExp(baseRe.source, baseRe.flags);
      let m = re.exec(txt);
      while (m !== null) {
        const body = m[1] || "";
        const stmts = splitStatements(body).filter(Boolean);
        for (const st of stmts) {
          keys.add(hashForStatement(st));
        }
        m = re.exec(txt);
      }
    }
  }
  return keys;
}

function loadHistoricalActiveCreateHashes() {
  // 「現在時点で生きている CREATE INDEX / UNIQUE INDEX」のハッシュ集合
  const activeByIndex = new Map(); // indexName -> hash
  const activeHashes = new Set();

  if (!fs.existsSync(MIGRATIONS_DIR)) return activeHashes;

  const dirs = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(); // ここで時系列順になる

  const blockRes = [
    /-- GENERATED_EXTENSIONS_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_EXTENSIONS_END [a-f0-9]{12}\b/gm,
    /-- GENERATED_AUGMENT_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_AUGMENT_END [a-f0-9]{12}\b/gm,
    /-- GENERATED_PARTIALS_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_PARTIALS_END [a-f0-9]{12}\b/gm,
  ];

  for (const d of dirs) {
    const p = path.join(MIGRATIONS_DIR, d, "migration.sql");
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, "utf8");

    for (const baseRe of blockRes) {
      const re = new RegExp(baseRe.source, baseRe.flags);
      let m = re.exec(txt);
      while (m !== null) {
        const body = m[1] || "";
        const stmts = splitStatements(body).filter(Boolean);

        for (const raw of stmts) {
          const stmt = normalizeTerminator(raw).trim();
          const stripped = stmt.replace(/--.*$/gm, "").trim();
          if (!stripped) continue;

          // CREATE INDEX / CREATE UNIQUE INDEX
          if (/^\s*CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(stripped)) {
            const h = hashForStatement(stmt);
            const mm = stripped.match(
              /^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+(IF\s+NOT\s+EXISTS\s+)?("?([\w]+)"?)/i,
            );
            if (!mm) continue;
            const indexName = mm[3] || `"${mm[4]}"`;

            activeByIndex.set(indexName, h);
            continue;
          }

          // DROP INDEX IF EXISTS indexName
          const dropMatch = stripped.match(
            /^\s*DROP\s+INDEX\s+(IF\s+EXISTS\s+)?("?([\w]+)"?)/i,
          );
          if (dropMatch) {
            const indexName = dropMatch[2] || `"${dropMatch[3]}"`;
            activeByIndex.delete(indexName);
          }
        }
        m = re.exec(txt);
      }
    }
  }

  for (const h of activeByIndex.values()) {
    activeHashes.add(h);
  }
  return activeHashes;
}

function loadHistoricalCreates() {
  // hashForStatement(sql) -> { stmt, indexName }
  const creates = new Map();

  if (!fs.existsSync(MIGRATIONS_DIR)) return creates;

  const dirs = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const blockRes = [
    /-- GENERATED_EXTENSIONS_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_EXTENSIONS_END [a-f0-9]{12}\b/gm,
    /-- GENERATED_AUGMENT_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_AUGMENT_END [a-f0-9]{12}\b/gm,
    /-- GENERATED_PARTIALS_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_PARTIALS_END [a-f0-9]{12}\b/gm,
  ];

  for (const d of dirs) {
    const p = path.join(MIGRATIONS_DIR, d, "migration.sql");
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, "utf8");

    for (const baseRe of blockRes) {
      const re = new RegExp(baseRe.source, baseRe.flags);
      let m = re.exec(txt);
      while (m !== null) {
        const body = m[1] || "";
        const stmts = splitStatements(body).filter(Boolean);

        for (const raw of stmts) {
          const stmt = normalizeTerminator(raw).trim();

          // コメントを全部落とした版（kind コメントが先頭に来ても大丈夫にする）
          const stripped = stmt.replace(/--.*$/gm, "").trim();
          if (!stripped) continue;

          // CREATE [UNIQUE] INDEX ... のみ対象
          if (!/^\s*CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(stripped)) continue;

          const h = hashForStatement(stmt); // ハッシュは元の stmt（コメント込み）でも stripped でもどちらでもよいが、hashForStatement 内でコメントは消しているのでどちらでも同じになる

          // インデックス名を取り出す
          const mm = stripped.match(
            /^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+(IF\s+NOT\s+EXISTS\s+)?("?([\w]+)"?)/i,
          );
          if (!mm) continue;

          const indexName = mm[3] || `"${mm[4]}"`;
          creates.set(h, { stmt, indexName });

          if (DEBUG) {
            console.log("[DEBUG] hist CREATE:", {
              hash: h,
              indexName,
              stmt,
              migration: d,
            });
          }
        }
        m = re.exec(txt);
      }
    }
  }

  if (DEBUG) {
    console.log("[DEBUG] loadHistoricalCreates: total =", creates.size);
  }

  return creates;
}

function loadHistoricalRawStatements() {
  // GENERATED_* ブロックのうち -- kind: raw のものだけを @raw.sql 由来として拾う
  // hashForStatement(sql) -> stmt
  const raws = new Map();

  if (!fs.existsSync(MIGRATIONS_DIR)) return raws;

  const dirs = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const blockRes = [
    /-- GENERATED_EXTENSIONS_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_EXTENSIONS_END [a-f0-9]{12}\b/gm,
    /-- GENERATED_AUGMENT_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_AUGMENT_END [a-f0-9]{12}\b/gm,
    /-- GENERATED_PARTIALS_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_PARTIALS_END [a-f0-9]{12}\b/gm,
  ];

  for (const d of dirs) {
    const p = path.join(MIGRATIONS_DIR, d, "migration.sql");
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, "utf8");

    for (const baseRe of blockRes) {
      const re = new RegExp(baseRe.source, baseRe.flags);
      let m = re.exec(txt);
      while (m !== null) {
        const body = m[1] || "";
        const stmts = splitStatements(body).filter(Boolean);

        for (const raw of stmts) {
          const stmt = normalizeTerminator(raw).trim();
          const stripped = stmt.replace(/--.*$/gm, "").trim();
          if (!stripped) continue;

          // 先頭行の kind コメントを見る
          const kindMatch = stmt.match(/^\s*--\s*kind:\s*(\w+)/i);
          const kind = kindMatch ? kindMatch[1].toLowerCase() : null;

          if (kind !== "raw") continue;

          const h = hashForStatement(stmt);
          if (!raws.has(h)) {
            raws.set(h, stmt);
          }
        }
        m = re.exec(txt);
      }
    }
  }

  if (DEBUG) {
    console.log(
      "[DEBUG] loadHistoricalRawStatements(kind=raw): total =",
      raws.size,
    );
  }

  return raws;
}

// ========== 追加のヘルパ ==========
function pickLatestMigrationDir() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(
      "prisma/migrations がありません。先に `npx prisma migrate dev --create-only` を実行してください。",
    );
  }
  const dirs = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  if (!dirs.length)
    throw new Error(
      "マイグレーションが存在しません。先に --create-only で作ってください。",
    );

  const stamp = (s) => {
    const m = s.match(/^(\d+)_/);
    return m ? Number(m[1]) : NaN;
  };
  let latest = null,
    best = -1;
  for (const d of dirs) {
    const st = stamp(d);
    if (!Number.isNaN(st) && st > best) {
      best = st;
      latest = d;
    }
  }
  if (!latest) {
    latest = dirs
      .map((d) => {
        const p = path.join(MIGRATIONS_DIR, d, "migration.sql");
        const stat = fs.existsSync(p)
          ? fs.statSync(p)
          : fs.statSync(path.join(MIGRATIONS_DIR, d));
        return { d, t: stat.mtimeMs };
      })
      .sort((a, b) => a.t - b.t)
      .pop().d;
  }
  return path.join(MIGRATIONS_DIR, latest);
}
function writeFileAtomic(filePath, content) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}
function writeBlockAtTop(filePath, block, dryRun) {
  const txt = fs.readFileSync(filePath, "utf8");
  const beginReTop = new RegExp(
    `^-- ${EXT_MARK}_BEGIN [a-f0-9]{12}[\\s\\S]*?-- ${EXT_MARK}_END [a-f0-9]{12}\\s*\\n?`,
    "m",
  );

  let next;
  if (beginReTop.test(txt)) {
    next = txt.replace(beginReTop, `${block}\n`);
  } else {
    next = `${block}\n${txt}`;
  }

  if (dryRun) {
    console.log("[DRY-RUN] would write EXTENSIONS block at file head:");
    console.log(`  ${filePath}`);
    console.log(block.trimEnd());
    return txt;
  } else {
    writeFileAtomic(filePath, next);
    return next;
  }
}
function isCreateExtension(stmt) {
  return /^\s*CREATE\s+EXTENSION\b/i.test(stmt);
}
function hashForBundle(body) {
  return crypto
    .createHash("sha256")
    .update(normalizeForDedup(body))
    .digest("hex")
    .slice(0, 12);
}

function hashForStatement(sql) {
  return crypto
    .createHash("sha256")
    .update(normalizeForDedup(sql)) // コメント除去・空白正規化・末尾;統一
    .digest("hex")
    .slice(0, 12); // 好みで桁数変更可（12桁で十分衝突耐性あり）
}

// ========== 同一 migration 内の DROP/ADD 衝突回避 ==========
function filterConflictsWithFile(stmts, migrationSql) {
  const drops = new Set();
  const dropRe = /ALTER\s+TABLE\s+"?([\w.]+)"?\s+DROP\s+COLUMN\s+"?([\w]+)"?/gi;
  let m;
  while (true) {
    m = dropRe.exec(migrationSql);
    if (m === null) break;
    drops.add(`${m[1]}::${m[2]}`.toLowerCase());
  }

  return stmts.filter((x) => {
    const add = x.stmt.match(
      /ALTER\s+TABLE\s+"?([\w.]+)"?\s+ADD\s+COLUMN\s+"?([\w]+)"/i,
    );
    if (add) {
      const key = `${add[1]}::${add[2]}`.toLowerCase();
      if (drops.has(key)) {
        console.warn(
          `WARN: Skipped ADD COLUMN that conflicts with DROP COLUMN in this migration: ${key}`,
        );
        return false;
      }
    }
    return true;
  });
}

// ========== 抽出: @@partialIndex / @@partialUnique / @raw.sql ==========
function extractDeclarativePartialIndexes(schemaText, modelMap) {
  const lines = schemaText.split(/\r?\n/);
  const blocks = [];
  let currentModel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const mStart = line.match(/^\s*model\s+(\w+)\s*\{/);
    if (mStart) {
      currentModel = mStart[1];
      continue;
    }
    if (/^\s*\}/.test(line)) {
      currentModel = null;
      continue;
    }

    const m = line.match(
      /^\s*\/\/\/\s*@@partialIndex\s*\(\s*\[([^\]]+)\]\s*(?:,([^)]*))?\)/,
    );
    if (!m || !currentModel) continue;

    const fieldList = m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const optionsRaw = (m[2] || "").trim();

    const info = modelMap[currentModel] || { table: currentModel, fields: {} };
    const table = info.table || currentModel;

    const cols = fieldList.map((f) => info.fields?.[f] || f);

    const opts = parseOptions(optionsRaw); // name / where / unique / schema
    const name = safeIdent(opts.name || `${table}_${cols.join("_")}_idx`);
    const schema = opts.schema || DEFAULT_SCHEMA;

    const hasDeleted = Object.values(info.fields || {}).includes("deleted_at");
    const where =
      opts.where !== undefined
        ? String(opts.where)
        : hasDeleted
          ? "deleted_at IS NULL"
          : null;

    const colList = cols.map((c) => `"${c}"`).join(",");
    const sql = `CREATE INDEX IF NOT EXISTS ${name}
  ON "${schema}"."${table}"(${colList})${where ? `\n  WHERE ${where}` : ""};`;

    blocks.push({ kind: "partialIndex", sql });
  }
  return blocks;
}
function extractDeclarativePartialUniques(schemaText, modelMap) {
  const lines = schemaText.split(/\r?\n/);
  const blocks = [];
  let currentModel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mStart = line.match(/^\s*model\s+(\w+)\s*\{/);
    if (mStart) {
      currentModel = mStart[1];
      continue;
    }
    if (/^\s*\}/.test(line)) {
      currentModel = null;
      continue;
    }

    const m = line.match(
      /^\s*\/\/\/\s*@@partialUnique\s*\(\s*\[([^\]]+)\]\s*(?:,([^)]*))?\)/,
    );
    if (!m || !currentModel) continue;

    const fieldList = m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const optionsRaw = (m[2] || "").trim();

    const info = modelMap[currentModel] || { table: currentModel, fields: {} };
    const table = info.table || currentModel;

    const cols = fieldList.map((f) => info.fields?.[f] || f);
    const opts = parseOptions(optionsRaw);
    const name = safeIdent(
      opts.name || `${table}_${cols.join("_")}_unique_active`,
    );
    const schema = opts.schema || DEFAULT_SCHEMA;

    const hasDeleted = Object.values(info.fields || {}).includes("deleted_at");
    const where =
      opts.where !== undefined
        ? String(opts.where)
        : hasDeleted
          ? "deleted_at IS NULL"
          : null;

    const colList = cols.map((c) => `"${c}"`).join(",");
    const sql = `CREATE UNIQUE INDEX IF NOT EXISTS ${name}
  ON "${schema}"."${table}"(${colList})${where ? `\n  WHERE ${where}` : ""};`;

    blocks.push({ kind: "partialUnique", sql });
  }
  return blocks;
}
function extractRawSqlBlocks(schemaText) {
  const lines = schemaText.split(/\r?\n/);
  const blocks = [];
  const headRe = /^\s*\/\/\/\s*@raw\.sql\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headRe);
    if (!m) continue;

    let sql = m[1] || "";
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      const mm = next.match(/^\s*\/\/\/\s(.*)$/);
      if (!mm) break;
      if (mm[1].trim().startsWith("@")) break;
      sql += `\n${mm[1]}`;
      j++;
    }
    const s = normalizeTerminator(sql);
    if (s.trim().length) blocks.push({ kind: "raw", sql: s });
    i = j - 1;
  }
  return blocks;
}

// ========== メイン ==========
function main() {
  const schema = readSchema();
  const modelMap = buildModelMap(schema);

  // 1) 抽出
  const blocks = [
    ...extractDeclarativePartialIndexes(schema, modelMap),
    ...extractDeclarativePartialUniques(schema, modelMap),
    ...extractRawSqlBlocks(schema),
  ];
  if (blocks.length === 0) {
    console.log(
      "No @@partial(Index|Unique) or @raw.sql blocks found. Skipped.",
    );
    return;
  }

  // 2) kind順に展開
  const expanded = [];
  for (const k of ORDER) {
    for (const b of blocks.filter((x) => x.kind === k)) {
      const stmts = splitStatements(b.sql);
      for (const st of stmts) {
        if (!st) continue;
        expanded.push({ kind: k, stmt: normalizeTerminator(st).trim() });
      }
    }
  }
  if (expanded.length === 0) {
    console.log("No SQL statements after expansion. Skipped.");
    return;
  }

  // 3) 最新 migration.sql 読み込み & 同一ファイル内衝突回避
  const latestDir = pickLatestMigrationDir();
  const migrationPath = path.join(latestDir, "migration.sql");
  const migrationSqlNow = fs.readFileSync(migrationPath, "utf8");
  const expandedNoConflicts = filterConflictsWithFile(
    expanded,
    migrationSqlNow,
  );

  // 4) 同一ラン内デデュープ（ハッシュ方式）
  const seenThisRun = new Set();
  const dedupedThisRun = [];
  for (const x of expandedNoConflicts) {
    const h = hashForStatement(x.stmt);
    if (seenThisRun.has(h)) continue;
    seenThisRun.add(h);
    // ハッシュを持たせておくと後段も楽
    dedupedThisRun.push({ ...x, hash: h });
  }

  if (DEBUG) {
    console.log("[DEBUG] dedupedThisRun count =", dedupedThisRun.length);
    for (const x of dedupedThisRun) {
      console.log("[DEBUG] deduped stmt:", {
        kind: x.kind,
        hash: x.hash,
        stmt: x.stmt,
      });
    }
  }

  // 5) 履歴ハッシュを収集
  const histKeys = loadHistoricalKeys();
  const histActiveCreateHashes = loadHistoricalActiveCreateHashes();

  if (DEBUG) {
    console.log("[DEBUG] histKeys count =", histKeys.size);
  }

  // 5.1) これまで GENERATED_* ブロックで生成した CREATE INDEX 群を取得
  const histCreates = loadHistoricalCreates();

  // 5.2) 今回 schema から生成された CREATE INDEX 群のハッシュ集合
  const currentCreateHashes = new Set(
    dedupedThisRun
      .filter((x) => /^\s*CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(x.stmt))
      .map((x) => x.hash),
  );

  if (DEBUG) {
    console.log(
      "[DEBUG] currentCreateHashes count =",
      currentCreateHashes.size,
    );
    console.log(
      "[DEBUG] currentCreateHashes =",
      Array.from(currentCreateHashes),
    );
  }

  // 5.2.1) 今回 schema から生成された raw (@raw.sql) 群のハッシュ集合
  const currentRawHashes = new Set(
    dedupedThisRun.filter((x) => x.kind === "raw").map((x) => x.hash),
  );

  // 5.2.2) 過去の「@raw.sql 由来っぽい SQL」を取得
  const histRawStmts = loadHistoricalRawStatements();

  // 5.2.3) 過去にはあったが、今回 schema からは出てこない raw SQL を警告
  const vanishedRaw = [];
  for (const [h, stmt] of histRawStmts) {
    if (!currentRawHashes.has(h)) {
      vanishedRaw.push({ hash: h, stmt });
    }
  }

  if (vanishedRaw.length > 0) {
    const header = DRY_RUN
      ? "[DRY-RUN] WARN: Some previously generated @raw.sql statements are no longer emitted from schema.prisma."
      : "WARN: Some previously generated @raw.sql statements are no longer emitted from schema.prisma.";
    console.warn(header);
    for (const { stmt } of vanishedRaw.slice(0, 10)) {
      // 長すぎる場合は少しだけ切って出す（お好みで）
      const oneLine = stmt.replace(/\s+/g, " ").slice(0, 200);
      console.warn(`  - ${oneLine}${oneLine.length === 200 ? " ..." : ""}`);
    }
    if (vanishedRaw.length > 10) {
      console.warn(`  (and ${vanishedRaw.length - 10} more ...)`);
    }
    console.warn(
      "  自動DROPは行われないので、必要であれば手動で逆操作のSQLを追加してください。",
    );
  }

  // 5.3) 「以前はあったが、今回 schema からは出てこない CREATE INDEX」→ DROP を作る
  const dropStmts = [];
  for (const [h, rec] of histCreates) {
    // 「今の履歴上、まだ生きているインデックス」だけ DROP 対象にする
    if (!histActiveCreateHashes.has(h)) continue;
    // まだ schema に存在するものは DROP 対象ではない
    if (currentCreateHashes.has(h)) continue;

    const dropSql = `DROP INDEX IF EXISTS ${rec.indexName};`;
    const dropHash = hashForStatement(dropSql);

    // 同一ラン内だけ重複排除すれば十分（履歴の DROP は無視する）
    if (seenThisRun.has(dropHash)) continue;

    dropStmts.push({
      kind: "drop",
      stmt: dropSql,
      hash: dropHash,
    });
    seenThisRun.add(dropHash);

    if (DEBUG) {
      console.log("[DEBUG] generated DROP:", {
        hash: dropHash,
        stmt: dropSql,
        fromHash: h,
        indexName: rec.indexName,
      });
    }
  }
  if (DEBUG) {
    console.log("[DEBUG] dropStmts count =", dropStmts.length);
  }

  // 5.4) 「今回 CREATE すべき新規」 + 「今回 DROP すべき分」をまとめる
  const news = dedupedThisRun.filter((x) => {
    const isCreateIndex = /^\s*CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(x.stmt);
    if (isCreateIndex) {
      // CREATE INDEX / UNIQUE INDEX は「まだ生きているもの」とだけ比較
      return !histActiveCreateHashes.has(x.hash);
    }
    // それ以外（RAW, EXTENSION など）は従来どおり全履歴と比較
    return !histKeys.has(x.hash);
  });
  const allNews = [...news, ...dropStmts];

  if (DEBUG) {
    console.log("[DEBUG] news count =", news.length);
    console.log("[DEBUG] allNews count =", allNews.length);
  }

  // 6) EXT と REST に分割
  const newsExt = allNews.filter((x) => isCreateExtension(x.stmt));
  const newsRest = allNews.filter((x) => !isCreateExtension(x.stmt));

  if (DEBUG) {
    console.log("[DEBUG] newsExt count =", newsExt.length);
    console.log("[DEBUG] newsRest count =", newsRest.length);
  }

  const bundleBodyExt = newsExt
    .map((x) => `-- kind: ${x.kind}\n${x.stmt}`)
    .join("\n\n");
  const bundleBodyRest = newsRest
    .map((x) => `-- kind: ${x.kind}\n${x.stmt}`)
    .join("\n\n");

  if (!bundleBodyExt && !bundleBodyRest) {
    const msg =
      "No new SQL statements to emit (after EXT/REST split). Skipped.";
    if (DRY_RUN) console.log(`[DRY-RUN] ${msg}`);
    else console.log(msg);
    return;
  }

  // 7) バンドル生成
  const extHash = bundleBodyExt ? hashForBundle(bundleBodyExt) : null;
  const restHash = bundleBodyRest ? hashForBundle(bundleBodyRest) : null;

  const extBundle = bundleBodyExt
    ? makeBundle(EXT_MARK, extHash, bundleBodyExt, "extensions")
    : "";
  const restBundle = bundleBodyRest
    ? makeBundle(
        REST_MARK,
        restHash,
        bundleBodyRest,
        "partialIndex/partialUnique/raw/drop",
      )
    : "";

  // 8) 書き込み：EXTは先頭、RESTは末尾（既存なら置換）
  let migrationSql = migrationSqlNow;

  if (extBundle) {
    migrationSql = writeBlockAtTop(migrationPath, extBundle, DRY_RUN);
    if (!DRY_RUN) migrationSql = fs.readFileSync(migrationPath, "utf8");
  }

  if (restBundle) {
    const restRe = new RegExp(
      `-- ${REST_MARK}_BEGIN [a-f0-9]{12}[\\s\\S]*?-- ${REST_MARK}_END [a-f0-9]{12}\\s*`,
      "m",
    );
    const willReplace = restRe.test(migrationSql);
    const nextSql = willReplace
      ? migrationSql.replace(restRe, restBundle)
      : migrationSql + restBundle;

    if (DRY_RUN) {
      console.log(
        "[DRY-RUN] prisma-partials would " +
          (willReplace ? "replace" : "append") +
          " REST block in:",
      );
      console.log(`  ${migrationPath}`);
      console.log("EXT Hash:", extHash);
      console.log("REST Hash:", restHash);
      console.log("--- EXT bundle begin ---");
      if (extBundle) console.log(extBundle.trimEnd());
      console.log("--- EXT bundle end ---");
      console.log("--- REST bundle begin ---");
      console.log(restBundle.trimEnd());
      console.log("--- REST bundle end ---");
      console.log("(no file written)");
      return;
    }

    writeFileAtomic(migrationPath, nextSql);
    console.log(
      `prisma-partials: wrote EXT at head (${extHash || "none"}), and ${
        willReplace ? "updated REST" : "appended REST"
      } (${restHash || "none"}) to ${migrationPath}`,
    );
  } else {
    if (DRY_RUN)
      console.log(
        "[DRY-RUN] prisma-partials would write only EXT block at head (REST none).",
      );
    else
      console.log(
        `prisma-partials: wrote only EXT block at head (${extHash}) to ${migrationPath}`,
      );
  }
}

try {
  main();
} catch (e) {
  console.error(`prisma-partials: ERROR:\n${e?.stack ? e.stack : String(e)}`);
  process.exit(1);
}
