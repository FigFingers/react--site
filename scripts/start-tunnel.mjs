import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

if (!existsSync(envPath)) {
  console.log("[tunnel] .env.local not found, skipping.");
  process.exit(0);
}

const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
  if (m) env[m[1]] = m[2].trim();
}

const { DB_SSH_USER, DB_SSH_PORT } = env;
if (!DB_SSH_USER || !DB_SSH_PORT) {
  console.log("[tunnel] DB_SSH_USER or DB_SSH_PORT not set, skipping.");
  process.exit(0);
}

// ポート 5432 が既に開いていれば二重起動をスキップ
const alreadyOpen = await new Promise((resolve) => {
  const s = createConnection({ port: 5432, host: "127.0.0.1" });
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
  console.log("[tunnel] port 5432 already open, skipping.");
  process.exit(0);
}

const sshCandidates = [
  "C:\\Program Files\\Git\\usr\\bin\\ssh.exe",
  "/usr/bin/ssh",
];
const sshExe = sshCandidates.find((p) => existsSync(p)) ?? "ssh";
const keyPath = join(
  process.env.USERPROFILE ?? process.env.HOME,
  ".ssh",
  "id_rsa",
);

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
    "5432:localhost:5432",
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

child.stderr.destroy();
child.unref();
console.log("[tunnel] ready.");
