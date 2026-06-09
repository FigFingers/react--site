import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const pidFile = join(root, ".tunnel.pid");

if (!existsSync(envPath)) {
  console.log("[tunnel] .env.local not found, skipping.");
  process.exit(0);
}

// Parse .env.local: handle quoted values and strip inline comments
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  let val = m[2].trim();
  if (val.startsWith('"') || val.startsWith("'")) {
    const q = val[0];
    const end = val.indexOf(q, 1);
    val = end !== -1 ? val.slice(1, end) : val.slice(1);
  } else {
    val = val.replace(/\s+#.*$/, "").trim();
  }
  env[m[1]] = val;
}

const { DB_SSH_USER, DB_SSH_PORT } = env;
if (!DB_SSH_USER || !DB_SSH_PORT) {
  process.exit(0);
}

const localPort = Number(env.DB_TUNNEL_LOCAL_PORT ?? "5432");
const remoteHost = env.DB_TUNNEL_REMOTE_HOST ?? "localhost";
const remotePort = env.DB_TUNNEL_REMOTE_PORT ?? "5432";
const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
const rawKeyPath = env.DB_SSH_KEY_PATH ?? join(home, ".ssh", "id_rsa");
// spawn() はシェルを介さないため ~ を展開する
const keyPath = rawKeyPath.replace(/^~(?=[/\\])/, home);

// PID ファイルが残っている場合: プロセスが生きていればスキップ、死んでいれば削除
if (existsSync(pidFile)) {
  const pid = Number(readFileSync(pidFile, "utf8").trim());
  try {
    process.kill(pid, 0); // プロセスが存在しなければ throws
    console.log(`[tunnel] tunnel already running (pid ${pid}), skipping.`);
    process.exit(0);
  } catch {
    // プロセスは既に終了 — stale PID ファイルを削除して続行
    unlinkSync(pidFile);
  }
}

// フォールバック: ポートが既に開いていれば（ローカル PostgreSQL 等）スキップ
const alreadyOpen = await new Promise((resolve) => {
  const s = createConnection({ port: localPort, host: "127.0.0.1" });
  s.on("connect", () => {
    s.destroy();
    resolve(true);
  });
  s.on("error", () => resolve(false));
  setTimeout(() => {
    s.destroy();
    resolve(false);
  }, 500);
});

if (alreadyOpen) {
  console.log(`[tunnel] port ${localPort} already open (local DB?), skipping.`);
  process.exit(0);
}

const sshCandidates = [
  "C:\\Program Files\\Git\\usr\\bin\\ssh.exe",
  "/usr/bin/ssh",
];
const sshExe = sshCandidates.find((p) => existsSync(p)) ?? "ssh";

console.log(`[tunnel] starting ${DB_SSH_USER} port ${DB_SSH_PORT}...`);

const child = spawn(
  sshExe,
  [
    "-i",
    keyPath,
    "-p",
    DB_SSH_PORT,
    "-N",
    "-L",
    `${localPort}:${remoteHost}:${remotePort}`,
    DB_SSH_USER,
  ],
  { detached: true, stdio: ["ignore", "ignore", "pipe"] },
);

// 2 秒以内に SSH が終了したら起動失敗と判断して dev を止める
child.stderr.pipe(process.stderr);
try {
  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) =>
      reject(new Error(`SSH exited prematurely (code ${code})`)),
    );
    setTimeout(resolve, 2000);
  });
} catch (e) {
  console.error(`[tunnel] ${e.message}`);
  process.exit(1);
}

writeFileSync(pidFile, String(child.pid));
child.stderr.destroy();
child.unref();
console.log("[tunnel] ready.");
