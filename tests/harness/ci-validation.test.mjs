import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// That quick typechecks with tsconfig.typecheck.json is covered by running the
// harness in tests/tooling/codex-harness.test.mjs, so it is not re-matched here.
test("CI uses the typecheck config that includes smoke .mts files", () => {
  const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
  const typecheckConfig = readFileSync("tsconfig.typecheck.json", "utf8");

  assert.match(
    workflow,
    /- name: Quick validation\s+run: node scripts\/codex-harness\.mjs quick/,
  );
  assert.match(typecheckConfig, /"\*\*\/\*\.mts"/);
});
