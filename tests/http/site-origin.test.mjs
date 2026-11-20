import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

const site = "https://app.example";
// cors.ts builds its allow-list when first loaded. Give it the two shapes the
// old code mishandled: a blank AUTH_URL and a NEXTAUTH_URL with a trailing slash.
process.env.AUTH_URL = "";
process.env.NEXTAUTH_URL = `${site}/`;
process.env.CLIP_API_ALLOWED_ORIGINS = "";

const { configuredSiteOrigin, requireSiteOrigin } = await import(
  "../../src/server/http/site-origin.ts"
);
const { isAllowedClipWriteOrigin } = await import(
  "../../src/server/http/cors.ts"
);
const { createRouteHandlers } = await import("../../src/server/api/handler.ts");

function setEnv(t, env) {
  const saved = {};
  for (const [name, value] of Object.entries(env)) {
    saved[name] = process.env[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  t.after(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}

test("AUTH_URL wins, blank values fall through, and only the origin is kept", (t) => {
  for (const [env, expected] of [
    [
      { AUTH_URL: `${site}/base/`, NEXTAUTH_URL: "https://other.example" },
      site,
    ],
    [{ AUTH_URL: "", NEXTAUTH_URL: `${site}/` }, site],
    [{ AUTH_URL: "  ", NEXTAUTH_URL: ` ${site} ` }, site],
    [
      { AUTH_URL: undefined, NEXTAUTH_URL: "http://localhost:3000" },
      "http://localhost:3000",
    ],
  ]) {
    setEnv(t, env);
    assert.equal(configuredSiteOrigin(), expected, JSON.stringify(env));
    assert.equal(requireSiteOrigin(), expected);
  }
});

test("missing configuration names both variables", (t) => {
  for (const env of [
    { AUTH_URL: undefined, NEXTAUTH_URL: undefined },
    { AUTH_URL: "", NEXTAUTH_URL: " " },
  ]) {
    setEnv(t, env);
    assert.equal(configuredSiteOrigin(), undefined);
    assert.throws(requireSiteOrigin, /AUTH_URL or NEXTAUTH_URL/);
  }
});

test("values that are not http(s) URLs are configuration errors", (t) => {
  for (const [env, name] of [
    [{ AUTH_URL: "app.example", NEXTAUTH_URL: site }, "AUTH_URL"],
    // Would otherwise become the opaque origin "null" and match sandboxed pages.
    [{ AUTH_URL: "localhost:3000", NEXTAUTH_URL: undefined }, "AUTH_URL"],
    [
      { AUTH_URL: undefined, NEXTAUTH_URL: "ftp://app.example" },
      "NEXTAUTH_URL",
    ],
  ]) {
    setEnv(t, env);
    assert.throws(
      configuredSiteOrigin,
      new RegExp(`^Error: ${name} must be an absolute http\\(s\\) URL$`),
    );
  }
});

test("the extension allow-list uses the same site origin", () => {
  // Built at import from AUTH_URL="" and NEXTAUTH_URL="https://app.example/".
  // Comparing the raw value would never match the Origin header.
  assert.equal(
    isAllowedClipWriteOrigin(
      new Request(`${site}/api/extension/link`, { headers: { origin: site } }),
    ),
    true,
  );
});

const { POST } = createRouteHandlers({
  POST: () => new Response(null, { status: 204 }),
});

function post(headers) {
  return POST(
    new NextRequest("http://localhost:3000/api/v1/example", {
      method: "POST",
      headers,
    }),
    { params: {} },
  );
}

test("v1 writes accept the site when AUTH_URL is blank", async (t) => {
  t.mock.method(console, "error", () => {});
  setEnv(t, { AUTH_URL: "", NEXTAUTH_URL: site });
  assert.equal(
    (await post({ origin: site, "sec-fetch-site": "same-origin" })).status,
    204,
  );
  const foreign = await post({ origin: "https://foreign.example" });
  assert.equal(foreign.status, 403);
  assert.equal((await foreign.json()).code, "ORIGIN_NOT_ALLOWED");
});

test("without a site URL, browser writes fail as a configuration error", async (t) => {
  const logged = [];
  t.mock.method(console, "error", (...args) => logged.push(args));
  setEnv(t, { AUTH_URL: undefined, NEXTAUTH_URL: undefined });

  // The site's own page would otherwise look like a cross-origin attacker.
  const own = await post({ origin: site, "sec-fetch-site": "same-origin" });
  assert.equal(own.status, 500);
  assert.equal((await own.json()).code, "INTERNAL_ERROR");
  assert.match(logged[0][1].error.message, /AUTH_URL or NEXTAUTH_URL/);

  // Requests rejected on their headers alone, and non-browser callers, do not
  // need the site URL.
  assert.equal((await post({ "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal((await post({})).status, 204);
});
