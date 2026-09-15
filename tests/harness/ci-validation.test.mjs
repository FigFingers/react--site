import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("CI uses the typecheck config that includes smoke .mts files", () => {
  const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
  const typecheckConfig = readFileSync("tsconfig.typecheck.json", "utf8");
  const harness = readFileSync("scripts/codex-harness.mjs", "utf8");

  assert.match(
    workflow,
    /- name: Quick validation\s+run: node scripts\/codex-harness\.mjs quick/,
  );
  assert.match(
    harness,
    /runCli\("typescript", "tsc", \[\s*"-p",\s*"tsconfig\.typecheck\.json",/,
  );
  assert.match(typecheckConfig, /"\*\*\/\*\.mts"/);
});
