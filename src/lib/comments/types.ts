export type ClipComment = {
  id: number;
  clipId: number;
  userId: number | null;
  username: string | null;
  body: string;
  /** 動画内の位置(ms)。null は「クリップ全体へのコメント」。 */
  atMs: number | null;
  createdAt: string;
};

import type { ReportReason } from "./reportReasons";

export type { ReportReason };

export type ReportSummary = {
  reportCount: number;
  recentReports: Array<{
    reason: ReportReason;
    note: string | null;
    createdAt: string;
  }>;
};

export type ReportSummaryRow = ReportSummary & {
  comment: ClipComment;
};
