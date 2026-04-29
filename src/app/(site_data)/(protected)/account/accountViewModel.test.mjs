import test from "node:test";
import assert from "node:assert/strict";
import {
  collectSubscriptionServices,
  formatDateJa,
  formatSubscriptionLabel,
} from "./accountViewModel.mjs";

test("collectSubscriptionServices removes blanks and duplicates", () => {
  const clips = [
    { service: "Netflix" },
    { service: " Prime Video " },
    { service: "Netflix" },
    { service: "" },
    { service: "   " },
    { service: null },
  ];

  assert.deepEqual(collectSubscriptionServices(clips), [
    "Netflix",
    "Prime Video",
  ]);
});

test("formatSubscriptionLabel returns fallback text when empty", () => {
  assert.equal(formatSubscriptionLabel([]), "未連携（仮表示）");
});

test("formatSubscriptionLabel joins labels with slash", () => {
  assert.equal(
    formatSubscriptionLabel(["Netflix", "U-NEXT"]),
    "Netflix / U-NEXT",
  );
});

test("formatDateJa returns date in ja-JP locale", () => {
  assert.equal(formatDateJa(new Date("2026-04-28T00:00:00.000Z")), "2026/04/28");
});
