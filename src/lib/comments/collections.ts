import type { ReportSummary } from "./types";

type Identified = { id: number };

export function upsertCommentsById<T extends Identified>(
  current: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map<number, T>();
  for (const comment of current) byId.set(comment.id, comment);
  for (const comment of incoming) byId.set(comment.id, comment);
  return [...byId.values()].sort((left, right) => {
    if (left.id === right.id) return 0;
    return left.id > right.id ? -1 : 1;
  });
}

export function upsertReportedCommentsById<T extends Identified>(
  current: readonly T[],
  reportRows: ReadonlyArray<{ comment: T }>,
): T[] {
  return upsertCommentsById(
    current,
    reportRows.map((row) => row.comment),
  );
}

/** 通報サマリーに載せる最近の通報の件数。サーバーの listReportedCommentsForClip と同じ。 */
const RECENT_REPORTS_LIMIT = 5;

/**
 * 通報 1 件を、そのコメントの通報サマリーへ足す。クリップ所有者が自分のクリップの
 * コメントを通報したときに、画面のサマリーをその場で更新するのに使う。
 */
export function addReportToSummary(
  current: ReportSummary | undefined,
  report: ReportSummary["recentReports"][number],
): ReportSummary {
  return {
    reportCount: (current?.reportCount ?? 0) + 1,
    recentReports: [report, ...(current?.recentReports ?? [])].slice(
      0,
      RECENT_REPORTS_LIMIT,
    ),
  };
}
