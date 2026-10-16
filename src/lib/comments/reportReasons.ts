// 通報理由の唯一の定義。サーバーの zod スキーマも、画面の型と選択肢もここを参照する。
// zod を含まないモジュールに置くのは、クライアントバンドルにスキーマを持ち込まないため。
// DB の CHECK 制約（20260809000000_harden_clip_comments）も同じ値を持つので、
// 値を増減するときは新しいマイグレーションで制約も張り替えること。
export const CLIP_COMMENT_REPORT_REASONS = [
  "spam",
  "harassment",
  "spoiler",
  "other",
] as const;

export type ReportReason = (typeof CLIP_COMMENT_REPORT_REASONS)[number];
