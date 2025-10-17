// scripts/prisma-partials.js
// 宣言的 @@partialIndex / @@partialUnique と /// @raw.sql を解析し、
// 生成SQLを「過去生成分との差分のみ」最新 migration.sql に追記（または置換）する。
// - ドライラン: --check / 環境変数 DRY_RUN=1
// - 履歴重複排除: 過去の GENERATED_PARTIALS_* ブロックから既出SQLを収集し、新規分のみ出力
//
// biome-ignore-all lint/suspicious/noConsole: cli script

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const SCHEMA = path.resolve("prisma/schema.prisma");
const MIGRATIONS_DIR = path.resolve("prisma/migrations");

const DEFAULT_SCHEMA = "public";
const ORDER = ["partialIndex", "partialUnique", "raw"]; // kind の出力順

const DRY_RUN = process.argv.includes("--check") || process.env.DRY_RUN === "1";

// ========== 便利関数 ==========
function readSchema() {
  return fs.readFileSync(SCHEMA, "utf8");
}

// 識別子(未クォート名)の安全化
function safeIdent(name) {
  return String(name || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase()
    .replace(/^_+/, "")
    .slice(0, 63);
}

// @@map/@map を考慮して model/field→table/column を解決
function buildModelMap(schemaText) {
  const lines = schemaText.split(/\r?\n/);
  const models = {};
  let cur = null;

  for (const line of lines) {
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

    const fmap = line.match(/^\s*(\w+)\s+[^\s{]+[^@{]*@map\(\s*"([^"]+)"\s*\)/);
    if (fmap) {
      cur.fields[fmap[1]] = fmap[2];
      continue;
    }

    const fonly = line.match(/^\s*(\w+)\s+[^\s{]+/);
    if (fonly && !cur.fields[fonly[1]]) {
      cur.fields[fonly[1]] = fonly[1];
    }
  }
  return models;
}

// オプション "key=value, key2='a, b'" の安全分割と解析
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
    const m = part.match(/^\s*(\w+)\s*[:=]\s*(.+)\s*$/); // name: "x" も name="x" も許容
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

// 終端セミコロンの正規化
function normalizeTerminator(sql) {
  const t = String(sql || "").trim();
  if (/DO\s+\$\$[\s\S]*\$\$\s*;?\s*$/i.test(t))
    return t.replace(/\s*;?\s*$/, ";");
  return t.replace(/;?\s*$/, ";");
}

// 生成済みSQLの重複検出のための簡易正規化
function normalizeForDedup(sql) {
  return String(sql || "")
    .replace(/--.*$/gm, "") // 行末コメント除去
    .replace(/\s+/g, " ") // 連続空白→1
    .replace(/\s*;\s*$/, ";") // 末尾セミコロン統一
    .trim();
}

// セミコロン区切り文分割（DO $$ ... $$; は1文）
function splitStatements(text) {
  const out = [];
  let buf = "";
  let inDollar = false;
  let i = 0;
  const s = String(text || "");
  while (i < s.length) {
    if (!inDollar) {
      // DO $$
      if (s.slice(i).match(/^DO\s+\$\$/i)) {
        const m = s.slice(i).match(/^DO\s+\$\$/i)[0];
        buf += m;
        i += m.length;
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
      // $$; まで
      const m2 = s.slice(i).match(/^\$\$\s*;/);
      if (m2) {
        buf += m2[0];
        out.push(buf.trim());
        buf = "";
        i += m2[0].length;
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

// 既存 migrations から GENERATED ブロック内の「既出SQL集合」を収集
function loadHistoricalGeneratedSqlSet() {
  const seen = new Set();
  if (!fs.existsSync(MIGRATIONS_DIR)) return seen;
  const dirs = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const blockRe =
    /-- GENERATED_PARTIALS_BEGIN [a-f0-9]{12}\b([\s\S]*?)-- GENERATED_PARTIALS_END [a-f0-9]{12}\b/gm;

  for (const d of dirs) {
    const p = path.join(MIGRATIONS_DIR, d, "migration.sql");
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, "utf8");
    let m;
    while (true) {
      m = blockRe.exec(txt);
      if (m === null) break;
      const body = m[1] || "";
      // kind 行はそのまま流し、SQL 文だけ抽出
      const stmts = splitStatements(body).filter(
        (st) => st && !/^--\s*kind:/i.test(st),
      );
      for (const st of stmts) {
        seen.add(normalizeForDedup(st));
      }
    }
  }
  return seen;
}

// 最新 migration ディレクトリ取得（タイムスタンプ接頭辞優先→mtime）
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

    // コメント化ディレクティブ: /// @@partialIndex([...])
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

    // 論理名→物理名（見つからなければ物理名とみなす）
    const cols = fieldList.map((f) => info.fields?.[f] || f);

    const opts = parseOptions(optionsRaw); // name / where / unique / schema
    const name = safeIdent(opts.name || `${table}_${cols.join("_")}_idx`);
    const schema = opts.schema || DEFAULT_SCHEMA;

    // deleted_at が物理列として存在するなら WHERE 既定補完
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

    // コメント化ディレクティブ: /// @@partialUnique([...])
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
      if (mm[1].trim().startsWith("@")) break; // 次のタグで打ち切り
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

  // 1) 宣言的 + RAW を抽出
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

  // 2) kind順に並べる＆「文単位」に展開して kind 情報を保持
  const expanded = []; // [{kind, stmt}]
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

  // 3) 履歴から既出SQL集合をロードし、新規だけ残す
  const seen = loadHistoricalGeneratedSqlSet();
  const news = expanded.filter((x) => !seen.has(normalizeForDedup(x.stmt)));

  if (news.length === 0) {
    const msg = "No new SQL statements to emit (deduped by history). Skipped.";
    if (DRY_RUN) console.log(`[DRY-RUN] ${msg}`);
    else console.log(msg);
    return;
  }

  // 4) バンドル本文（kind ヘッダ付きで再構成）
  const bundleBody = news
    .map((x) => `-- kind: ${x.kind}\n${x.stmt}`)
    .join("\n\n");

  // ハッシュは“意味的差分に強い”よう軽く正規化してから算出
  const markerHash = crypto
    .createHash("sha256")
    .update(normalizeForDedup(bundleBody))
    .digest("hex")
    .slice(0, 12);

  const bundle =
    `\n-- GENERATED_PARTIALS_BEGIN ${markerHash}\n` +
    `-- 以下は schema.prisma の注釈から自動生成されています (partialIndex/partialUnique/raw)\n` +
    bundleBody +
    `\n` +
    `-- GENERATED_PARTIALS_END ${markerHash}\n`;

  // 5) 最新 migration.sql の GENERATED ブロックは「置換」。なければ追記。
  const latestDir = pickLatestMigrationDir();
  const migrationPath = path.join(latestDir, "migration.sql");
  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  const beginRe =
    /-- GENERATED_PARTIALS_BEGIN [a-f0-9]{12}[\s\S]*?-- GENERATED_PARTIALS_END [a-f0-9]{12}\s*/m;
  const willReplace = beginRe.test(migrationSql);
  const nextSql = willReplace
    ? migrationSql.replace(beginRe, bundle)
    : migrationSql + bundle;

  if (DRY_RUN) {
    console.log(
      "[DRY-RUN] prisma-partials would " +
        (willReplace ? "replace" : "append") +
        " block in:",
    );
    console.log(`  ${migrationPath}`);
    console.log("Hash:", markerHash);
    console.log("--- bundle begin ---");
    console.log(bundle.trimEnd());
    console.log("--- bundle end ---");
    console.log("(no file written)");
    return;
  }

  writeFileAtomic(migrationPath, nextSql);
  console.log(
    `prisma-partials: ${willReplace ? "updated" : "appended"} (hash=${markerHash}, file=${migrationPath})`,
  );
}

try {
  main();
} catch (e) {
  console.error(`prisma-partials: ERROR:\n${e?.stack ? e.stack : String(e)}`);
  process.exit(1);
}
