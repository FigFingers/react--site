import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { NextRequest } from "next/server";

const require = createRequire(import.meta.url);
const site = "https://app.example";
const extensionOrigin = "chrome-extension://some-other-extension";
// Configure before any import: cors.ts builds its allow-list at load time.
process.env.AUTH_URL = site;
process.env.CLIP_API_ALLOWED_ORIGINS = "chrome-extension://*";

function mockModule(relativePath, exports) {
  const filename = require.resolve(relativePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}

// Replace authentication and persistence only; the real routes, origin check,
// body parsing and error payloads run without OAuth credentials or a database.
const calls = { issue: [], revoke: [] };
mockModule("../../src/server/auth/session.ts", {
  requireUserId: async () => 100,
});
let sessionUser = { id: "100" };
mockModule("../../src/auth.ts", {
  auth: async () => (sessionUser ? { user: sessionUser } : null),
});
mockModule("../../src/server/services/extensions.ts", {
  issueExtensionLinkToken: async (userId) => {
    calls.issue.push(userId);
    return {
      linkToken: "one-time-link-token",
      expiresAt: new Date("2026-11-20T00:10:00.000Z"),
    };
  },
  revokeLinkedExtension: async (userId, linkedExtensionId) => {
    calls.revoke.push([userId, linkedExtensionId]);
    return { extensionInstanceId: "instance-1" };
  },
});

const linkTokenRoute = require("../../src/app/api/extension/link-token/route.ts");
const unlinkRoute = require("../../src/app/api/extension/unlink/route.ts");
const { isAllowedClipWriteOrigin } = require("../../src/server/http/cors.ts");

const routes = [
  {
    name: "link-token",
    module: linkTokenRoute,
    calls: () => calls.issue,
    init: {},
  },
  {
    name: "unlink",
    module: unlinkRoute,
    calls: () => calls.revoke,
    init: {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkedExtensionId: 41 }),
    },
  },
];

function post(route, url, headers) {
  return route.module.POST(
    new NextRequest(url, {
      method: "POST",
      ...route.init,
      headers: { ...route.init.headers, ...headers },
    }),
  );
}

test("the extension allow-list in this test admits any extension origin", () => {
  // Without this, the rejections below would not show that the cookie routes
  // ignore the allow-list: a narrower list would reject them on its own.
  assert.equal(
    isAllowedClipWriteOrigin(
      new Request(`${site}/api/extension/sync`, {
        headers: { origin: extensionOrigin },
      }),
    ),
    true,
  );
});

for (const route of routes) {
  test(`${route.name} rejects extension and cross-site origins before acting`, async () => {
    for (const headers of [
      { origin: extensionOrigin },
      { origin: extensionOrigin, "sec-fetch-site": "none" },
      { origin: "https://foreign.example", "sec-fetch-site": "cross-site" },
      { origin: "null" },
      { "sec-fetch-site": "cross-site" },
    ]) {
      const response = await post(
        route,
        `${site}/api/extension/${route.name}`,
        headers,
      );
      assert.equal(response.status, 403, JSON.stringify(headers));
      assert.equal((await response.json()).code, "ORIGIN_NOT_ALLOWED");
      // No CORS grant: a cross-origin caller cannot read the link token.
      assert.equal(response.headers.get("access-control-allow-origin"), null);
    }
    assert.deepEqual(route.calls(), []);
  });

  test(`${route.name} still serves the site's own page behind a reverse proxy`, async () => {
    route.calls().length = 0;
    const response = await post(
      route,
      `http://localhost:3000/api/extension/${route.name}`,
      { origin: site, "sec-fetch-site": "same-origin" },
    );
    assert.equal(response.status, 200);
    assert.equal(route.calls().length, 1);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  });

  test(`${route.name} grants no cross-origin preflight`, () => {
    // Next.js answers OPTIONS itself without CORS headers when a route does
    // not export it, so browsers block cross-origin calls before the POST.
    assert.equal(route.module.OPTIONS, undefined);
  });
}

test("link-token and unlink return the same bodies as before", async () => {
  const headers = { origin: site, "sec-fetch-site": "same-origin" };
  const issued = await post(
    routes[0],
    `${site}/api/extension/link-token`,
    headers,
  );
  assert.deepEqual(await issued.json(), {
    linkToken: "one-time-link-token",
    expiresAt: "2026-11-20T00:10:00.000Z",
  });
  calls.revoke.length = 0;
  const unlinked = await post(
    routes[1],
    `${site}/api/extension/unlink`,
    headers,
  );
  assert.deepEqual(await unlinked.json(), {
    ok: true,
    extensionInstanceId: "instance-1",
  });
  assert.deepEqual(calls.revoke, [[100, 41]]);
});

test("unlink keeps its 401 responses for missing or malformed sessions", async (t) => {
  t.after(() => {
    sessionUser = { id: "100" };
  });
  const headers = { origin: site, "sec-fetch-site": "same-origin" };
  calls.revoke.length = 0;
  for (const [user, message] of [
    [null, "Authentication required"],
    [{ id: "not-a-number" }, "Invalid session user id"],
  ]) {
    sessionUser = user;
    const response = await post(
      routes[1],
      `${site}/api/extension/unlink`,
      headers,
    );
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.message, message);
    assert.equal(body.code, "UNAUTHORIZED");
  }
  assert.deepEqual(calls.revoke, []);
});
