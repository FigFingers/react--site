// src/lib/user-ids.ts
import { prisma } from "@/lib/prisma";

const RESERVED = new Set([
  "admin","root","api","support","help","system","me","login","logout","signup",
  "settings","about","privacy","terms","u","user","users"
]);

// ハンドル: 小文字、半角英数字 + . _ - のみ。連続記号を詰め、先頭末尾の記号を削除。
export function normalizeHandle(input: string): string {
  const lower = input.toLowerCase();
  const ascii = lower.normalize("NFKC").replace(/[^a-z0-9._-]/g, "-");
  const squeezed = ascii.replace(/[-._]{2,}/g, "-");
  const trimmed = squeezed.replace(/^[-._]+|[-._]+$/g, "");
  // 最低3文字に満たない場合は埋め草
  return trimmed.length >= 3 ? trimmed : `u-${trimmed || "user"}`;
}

// ニックネームの正規化キー: 小文字化 + 全角→半角（簡易）+ トリム
export function normalizeNickname(nick: string): string {
  return nick
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function randomSuffix(n = 4) {
  return Math.random().toString(36).slice(2, 2 + n);
}

// 衝突回避付きの一意ハンドル採番
export async function issueUniqueHandle(seed: string) {
  let base = normalizeHandle(seed);
  if (!base || RESERVED.has(base)) base = "user";
  let candidate = base;

  for (let i = 0; i < 6; i++) {
    const exists = await prisma.user.findUnique({ where: { handle: candidate } });
    if (!exists && !RESERVED.has(candidate)) return candidate;
    candidate = `${base}-${randomSuffix(3 + (i > 2 ? 1 : 0))}`; // 段階的に桁増やす
  }
  // 最終フォールバック
  return `user-${randomSuffix(6)}`;
}
