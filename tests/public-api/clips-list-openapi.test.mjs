import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { NextRequest } from "next/server";
import { sourceSection } from "../helpers/source.mjs";

const require = createRequire(import.meta.url);
// Use the existing Prisma singleton seam without connecting to a real DB.
const prisma = { clip: { findMany: async () => [] } };
globalThis.prisma = prisma;
// GET never authenticates, but the route module imports the session helper,
// which would load the OAuth configuration.
const sessionPath = require.resolve("../../src/server/auth/session.ts");
require.cache[sessionPath] = {
  id: sessionPath,
  filename: sessionPath,
  loaded: true,
  exports: { requireUserId: async () => assert.fail("GET must not sign in") },
};
// Resolves to the generated client through tsconfig paths, so the column lists
// below follow prisma/schema.prisma instead of a hand-written copy.
const { Prisma } = require("@prisma/client");
const { GET } = require("../../src/app/api/v1/clips/route.ts");

const columns = {
  clip: Object.values(Prisma.ClipScalarFieldEnum),
  vod: Object.values(Prisma.VodScalarFieldEnum),
  user: Object.values(Prisma.UserScalarFieldEnum),
};
const createdAt = new Date("2026-11-19T00:00:00.000Z");

function sampleRow(fields) {
  return Object.fromEntries(
    fields.map((field) => [field, field.endsWith("At") ? createdAt : 1n]),
  );
}

// Answer the query the way Prisma would: every Clip column, plus each included
// relation with either all of its columns or only the selected ones.
function rowFor(query) {
  const row = sampleRow(columns.clip);
  for (const [relation, include] of Object.entries(query.include ?? {})) {
    assert.ok(columns[relation], `unexpected include: ${relation}`);
    row[relation] = sampleRow(
      include === true ? columns[relation] : Object.keys(include.select),
    );
  }
  return row;
}

// Property names of a component schema, read without a YAML parser.
function declaredProperties(spec, schema, nextSchema) {
  const section = sourceSection(
    spec,
    `\n    ${schema}:\n`,
    `\n    ${nextSchema}:\n`,
  );
  const properties = sourceSection(
    section,
    "\n      properties:\n",
    "\n      required:\n",
  );
  return new Set(
    [...properties.matchAll(/^ {8}(\w+):$/gm)].map(([, name]) => name),
  );
}

function assertDeclared(object, declared, schema) {
  const undeclared = Object.keys(object).filter((key) => !declared.has(key));
  assert.deepEqual(
    undeclared,
    [],
    `${schema} sets additionalProperties: false, so these response fields make every list response invalid`,
  );
}

test("every field of a GET /api/v1/clips item is declared in the OpenAPI schemas", async (t) => {
  t.mock.method(prisma.clip, "findMany", async (query) => [rowFor(query)]);

  const response = await GET(
    new NextRequest("https://app.example/api/v1/clips"),
    { params: {} },
  );
  assert.equal(response.status, 200);
  const [item] = (await response.json()).data;
  assert.ok(item.vod, "the clip list is expected to include the VOD");
  assert.ok(item.user, "the clip list is expected to include the author");

  const spec = readFileSync(
    new URL("../../openapi/v1.yaml", import.meta.url),
    "utf8",
  );
  assertDeclared(item, declaredProperties(spec, "Clip", "ClipCreate"), "Clip");
  assertDeclared(item.vod, declaredProperties(spec, "Vod", "VodCreate"), "Vod");
  assertDeclared(
    item.user,
    declaredProperties(spec, "PublicUser", "Clip"),
    "PublicUser",
  );
});
