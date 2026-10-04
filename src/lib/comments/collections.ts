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

/**
 * 通報サマリーの 1 ページを、表示中のサマリーに反映する。
 *
 * 続きのページは足し込む。先頭ページは、続きを読んでいなければ置き換える
 * （開き直したときに古い表示を残さない）。続きを読み込み済みのときに先頭ページを
 * 読み直す場合（通報した直後の更新）も足し込む。置き換えると、読み込み済みの
 * 続きのページにあるバッジと「確認済みにする」ボタンが消える。
 */
export function mergeReportSummaryPage<T>(
  current: Readonly<Record<number, T>>,
  page: Readonly<Record<number, T>>,
  options: { isContinuation: boolean; hasLoadedContinuation: boolean },
): Record<number, T> {
  return options.isContinuation || options.hasLoadedContinuation
    ? { ...current, ...page }
    : { ...page };
}
