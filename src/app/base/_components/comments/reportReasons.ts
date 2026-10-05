import type { ReportReason } from "@/lib/comments/reportReasons";

// 理由の値は lib/comments/reportReasons.ts が唯一の定義。Record<ReportReason, …> なので、
// 理由を増減してラベルを書き忘れると型検査で落ちる。
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "スパム",
  harassment: "嫌がらせ",
  spoiler: "ネタバレ",
  other: "その他",
};
