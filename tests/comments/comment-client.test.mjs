import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { addReportToSummary, upsertCommentsById, upsertReportedCommentsById } =
  await import("../../src/lib/comments/collections.ts");
const {
  COMMENT_BODY_MAX_CODE_POINTS,
  REPORT_NOTE_MAX_CODE_POINTS,
  countUnicodeCodePoints,
  isWithinUnicodeCodePointLimit,
  limitUnicodeCodePoints,
} = await import("../../src/lib/comments/text.ts");

test("comment text limits count Unicode code points", () => {
  assert.equal(COMMENT_BODY_MAX_CODE_POINTS, 500);
  assert.equal(REPORT_NOTE_MAX_CODE_POINTS, 500);
  assert.equal(countUnicodeCodePoints("abc日本語"), 6);
  assert.equal("😀".length, 2);
  assert.equal(countUnicodeCodePoints("😀"), 1);
  assert.equal(countUnicodeCodePoints("👨‍👩‍👧‍👦"), 7);
});

test("comment text input is limited without splitting surrogate pairs", () => {
  const atLimit = `${"a".repeat(499)}😀`;
  const overLimit = `${atLimit}b`;

  assert.equal(countUnicodeCodePoints(atLimit), 500);
  assert.equal(isWithinUnicodeCodePointLimit(atLimit, 500), true);
  assert.equal(isWithinUnicodeCodePointLimit(overLimit, 500), false);
  assert.equal(limitUnicodeCodePoints(overLimit, 500), atLimit);
  assert.equal(limitUnicodeCodePoints("😀x", 1), "😀");
  assert.throws(() => limitUnicodeCodePoints("x", -1), RangeError);
});

test("reported comments are merged into the visible id-descending list", () => {
  const current = [
    { id: 30, body: "newest" },
    { id: 20, body: "old value" },
  ];
  const reportRows = [
    { comment: { id: 25, body: "reported between pages" } },
    { comment: { id: 5, body: "reported beyond the first page" } },
    { comment: { id: 20, body: "fresh response wins" } },
  ];

  assert.deepEqual(upsertReportedCommentsById(current, reportRows), [
    { id: 30, body: "newest" },
    { id: 25, body: "reported between pages" },
    { id: 20, body: "fresh response wins" },
    { id: 5, body: "reported beyond the first page" },
  ]);
  assert.deepEqual(upsertCommentsById([], current), current);
});

test("a new report updates only that comment's summary, keeping the newest five", () => {
  const report = (n) => ({
    reason: "spam",
    note: `note ${n}`,
    createdAt: `2026-10-0${n}T00:00:00.000Z`,
  });

  // まだサマリーの無いコメント（2 ページ目以降にあって未読込のものを含む）
  assert.deepEqual(addReportToSummary(undefined, report(1)), {
    reportCount: 1,
    recentReports: [report(1)],
  });

  // 既存のサマリーには件数を足し、新しい通報を先頭に置いて 5 件に収める
  const current = {
    reportCount: 7,
    recentReports: [report(5), report(4), report(3), report(2), report(1)],
  };
  assert.deepEqual(addReportToSummary(current, report(6)), {
    reportCount: 8,
    recentReports: [report(6), report(5), report(4), report(3), report(2)],
  });
  assert.equal(current.reportCount, 7, "the input summary is not mutated");
});

test("CommentModal asks for deletion inside the dialog, not with window.confirm", () => {
  const source = readFileSync(
    "src/app/base/_components/CommentModal.tsx",
    "utf8",
  );
  assert.doesNotMatch(source, /window\.confirm|\bconfirm\(/);
  assert.match(source, /<CommentDeleteConfirm/);
});

test("CommentModal keeps recovered comments visible and exposes list retry", () => {
  const source = readFileSync(
    "src/app/base/_components/CommentModal.tsx",
    "utf8",
  );

  assert.match(
    source,
    /setComments\(\(previous\) =>\s*upsertReportedCommentsById\(previous, rows\)/,
  );
  assert.match(source, /\{comments\.length > 0 &&\s*comments\.map/);
  assert.match(source, /onClick=\{\(\) => void retryFirstPage\(\)\}/);
  assert.doesNotMatch(source, /listState === "ready" &&\s*comments\.map/);
  for (const file of [
    "CommentModal.tsx",
    "comments/CommentComposer.tsx",
    "comments/CommentReportForm.tsx",
  ]) {
    const component = readFileSync(`src/app/base/_components/${file}`, "utf8");
    assert.doesNotMatch(component, /maxLength=/);
  }
});
