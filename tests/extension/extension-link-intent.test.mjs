import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// リポの他テストと同じ interop 耐性のある形にする。静的な default import は
// client.ts が default を持たないため、tsx が CJS へ落としている現在だけ通る。
// package.json に type: module が付くか tsx が真の ESM を吐いた時点で、
// このファイルだけでなく npm test 全体がリンク時 SyntaxError で落ちる。
const extensionClientModule = await import("../../src/lib/extension/client.ts");
const {
  ExtensionLinkError,
  linkExtensionToCurrentUserFromUserAction,
  unlinkExtensionFromCurrentUser,
} = extensionClientModule.default ?? extensionClientModule;

const CURRENT_INSTANCE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_INSTANCE_ID = "22222222-2222-4222-8222-222222222222";
const ORIGIN = "https://example.test";
const LINK_TOKEN = "one-time-link-token";
const LINK_RESULT_TIMEOUT_MS = 20_000;

function jsonResponse(body, ok = true) {
  return {
    ok,
    async json() {
      return body;
    },
  };
}

function linkResult(message, fields = { ok: true, linked: true }) {
  return {
    type: "EXTENSION_LINK_RESULT",
    requestId: message.requestId,
    reason: null,
    status: null,
    ...fields,
  };
}

// instanceId に配列を渡すと、GET_EXTENSION_INSTANCE_ID ごとに先頭から順に返す。
// respondToLink(message, reply) は EXT_LINK_WITH_LINK_TOKEN への拡張の応答を決める。
function installExtensionWindow(
  instanceId = CURRENT_INSTANCE_ID,
  { respondToLink = (message, reply) => reply(linkResult(message)) } = {},
) {
  const instanceIds = [instanceId].flat();
  const listeners = new Set();
  const messages = [];
  const reply = (data) =>
    queueMicrotask(() => {
      for (const handler of listeners) {
        handler({ source: browserWindow, origin: ORIGIN, data });
      }
    });
  const browserWindow = {
    location: { origin: ORIGIN },
    // 呼び出し時に解決し、t.mock.timers の差し替えを効かせる。
    setTimeout: (...args) => setTimeout(...args),
    clearTimeout: (id) => clearTimeout(id),
    addEventListener(type, handler) {
      if (type === "message") listeners.add(handler);
    },
    removeEventListener(type, handler) {
      if (type === "message") listeners.delete(handler);
    },
    postMessage(message, targetOrigin) {
      messages.push({ message, targetOrigin });
      if (message.type === "EXT_LINK_WITH_LINK_TOKEN") {
        respondToLink(message, reply);
        return;
      }
      if (message.type !== "GET_EXTENSION_INSTANCE_ID") return;

      reply({
        type: "EXTENSION_INSTANCE_ID_RESPONSE",
        requestId: message.requestId,
        ok: true,
        extensionInstanceId:
          instanceIds.length > 1 ? instanceIds.shift() : instanceIds[0],
      });
    },
  };

  globalThis.window = browserWindow;
  return { messages, listeners };
}

// サイト画面からの通信は linkToken の発行だけを許し、それ以外は失敗させる。
function installLinkTokenFetch() {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (url === "/api/extension/link-token") {
      return jsonResponse({
        linkToken: LINK_TOKEN,
        expiresAt: "2026-08-29T01:00:00.000Z",
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  return requests;
}

function restoreGlobalsAfter(t) {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  });
}

function linkMessagesOf(messages) {
  return messages
    .map(({ message }) => message)
    .filter(({ type }) => type === "EXT_LINK_WITH_LINK_TOKEN");
}

test("a root reload does not recreate a revoked extension link", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const accountPage = readFileSync(
    "src/app/(site_data)/(protected)/account/page.tsx",
    "utf8",
  );

  assert.doesNotMatch(layout, /ExtensionLinker/);
  assert.match(accountPage, /<ExtensionLinkButton \/>/);
});

test("an explicit account action can link the same instance again after unlink", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const { messages } = installExtensionWindow();
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (url === "/api/extension/unlink") {
      return jsonResponse({ extensionInstanceId: CURRENT_INSTANCE_ID });
    }
    if (url === "/api/extension/link-token") {
      return jsonResponse({
        linkToken: LINK_TOKEN,
        expiresAt: "2026-08-29T01:00:00.000Z",
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    await unlinkExtensionFromCurrentUser(41, CURRENT_INSTANCE_ID);
    const result = await linkExtensionToCurrentUserFromUserAction();

    assert.deepEqual(
      requests.map(({ url }) => url),
      ["/api/extension/unlink", "/api/extension/link-token"],
    );
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      linkedExtensionId: 41,
    });
    assert.deepEqual(
      messages.map(({ message }) => message.type),
      [
        "EXTENSION_UNLINKED",
        "GET_EXTENSION_INSTANCE_ID",
        "EXT_LINK_WITH_LINK_TOKEN",
      ],
    );
    assert.equal(messages[0].message.extensionInstanceId, CURRENT_INSTANCE_ID);
    assert.equal(messages[2].message.extensionInstanceId, CURRENT_INSTANCE_ID);
    assert.equal(messages[2].message.linkToken, LINK_TOKEN);
    assert.ok(messages.every(({ targetOrigin }) => targetOrigin === ORIGIN));
    assert.equal(result.extensionInstanceId, CURRENT_INSTANCE_ID);
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("unlink targets the server-confirmed instance when another browser performs it", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const { messages } = installExtensionWindow(CURRENT_INSTANCE_ID);

  globalThis.fetch = async () =>
    jsonResponse({ extensionInstanceId: OTHER_INSTANCE_ID });

  try {
    const result = await unlinkExtensionFromCurrentUser(
      42,
      CURRENT_INSTANCE_ID,
    );

    assert.equal(result.extensionInstanceId, OTHER_INSTANCE_ID);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].message.type, "EXTENSION_UNLINKED");
    assert.equal(messages[0].message.extensionInstanceId, OTHER_INSTANCE_ID);
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("the page sends only the link token and never receives the extension auth token", async (t) => {
  restoreGlobalsAfter(t);
  const { messages, listeners } = installExtensionWindow();
  const requests = installLinkTokenFetch();

  const result = await linkExtensionToCurrentUserFromUserAction();

  assert.deepEqual(
    requests.map(({ url }) => url),
    ["/api/extension/link-token"],
  );
  const [linkMessage] = linkMessagesOf(messages);
  assert.deepEqual(Object.keys(linkMessage).sort(), [
    "extensionInstanceId",
    "linkToken",
    "requestId",
    "type",
  ]);
  assert.equal(typeof linkMessage.requestId, "string");
  assert.notEqual(linkMessage.requestId, "");
  assert.equal(linkMessage.extensionInstanceId, CURRENT_INSTANCE_ID);
  assert.equal(linkMessage.linkToken, LINK_TOKEN);
  assert.equal("extensionAuthToken" in linkMessage, false);
  assert.ok(messages.every(({ targetOrigin }) => targetOrigin === ORIGIN));
  assert.deepEqual(result, { extensionInstanceId: CURRENT_INSTANCE_ID });
  assert.equal(listeners.size, 0);
});

test("the page code has no path that handles the extension auth token", () => {
  for (const path of [
    "src/lib/extension/client.ts",
    "src/components/ExtensionLinkButton.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /EXT_LINK_WITH_AUTH_TOKEN/, path);
    assert.doesNotMatch(source, /extensionAuthToken/, path);
    assert.doesNotMatch(source, /["'`]\/api\/extension\/link["'`]/, path);
  }
});

test("results for another request are ignored and a duplicate result is not handled twice", async (t) => {
  restoreGlobalsAfter(t);
  let listenersAtDuplicate;
  const { listeners } = installExtensionWindow(CURRENT_INSTANCE_ID, {
    respondToLink(message, reply) {
      // 先に届く別 requestId の失敗を受けていれば、ここで reject されるはず。
      reply(
        linkResult(
          { requestId: "another-request" },
          { ok: false, linked: false, reason: "link_token_used", status: 409 },
        ),
      );
      reply(linkResult(message));
      queueMicrotask(() => {
        listenersAtDuplicate = listeners.size;
      });
      reply(linkResult(message));
    },
  });
  installLinkTokenFetch();

  const result = await linkExtensionToCurrentUserFromUserAction();

  assert.deepEqual(result, { extensionInstanceId: CURRENT_INSTANCE_ID });
  // 一致した最初の結果で待機を終え、重複が届く時点では受け手がいない。
  assert.equal(listenersAtDuplicate, 0);
  assert.equal(listeners.size, 0);
});

test("a failed link result surfaces its reason and status without retrying", async (t) => {
  const cases = [
    {
      fields: {
        ok: false,
        linked: false,
        reason: "link_token_expired",
        status: 400,
      },
      reason: "link_token_expired",
      status: 400,
    },
    {
      fields: {
        ok: false,
        linked: false,
        reason: "background_unavailable",
        status: null,
      },
      reason: "background_unavailable",
      status: null,
    },
    {
      fields: { ok: false, linked: false, reason: null, status: 500 },
      reason: "link_failed",
      status: 500,
    },
    {
      fields: { ok: true, linked: false },
      reason: "link_failed",
      status: null,
    },
  ];

  for (const { fields, reason, status } of cases) {
    await t.test(`${JSON.stringify(fields)}`, async (t) => {
      restoreGlobalsAfter(t);
      const { messages, listeners } = installExtensionWindow(
        CURRENT_INSTANCE_ID,
        {
          respondToLink: (message, reply) => reply(linkResult(message, fields)),
        },
      );
      const requests = installLinkTokenFetch();

      await assert.rejects(
        linkExtensionToCurrentUserFromUserAction(),
        (error) =>
          error instanceof ExtensionLinkError &&
          error.reason === reason &&
          error.status === status,
      );
      assert.equal(requests.length, 1);
      assert.equal(linkMessagesOf(messages).length, 1);
      assert.equal(listeners.size, 0);
    });
  }
});

test("instance_mismatch re-reads the instance id and retries once", async (t) => {
  restoreGlobalsAfter(t);
  const { messages, listeners } = installExtensionWindow(
    [OTHER_INSTANCE_ID, CURRENT_INSTANCE_ID],
    {
      respondToLink: (message, reply) =>
        reply(
          message.extensionInstanceId === CURRENT_INSTANCE_ID
            ? linkResult(message)
            : linkResult(message, {
                ok: false,
                linked: false,
                reason: "instance_mismatch",
              }),
        ),
    },
  );
  const requests = installLinkTokenFetch();

  const result = await linkExtensionToCurrentUserFromUserAction();

  assert.deepEqual(result, { extensionInstanceId: CURRENT_INSTANCE_ID });
  assert.deepEqual(
    linkMessagesOf(messages).map(
      ({ extensionInstanceId }) => extensionInstanceId,
    ),
    [OTHER_INSTANCE_ID, CURRENT_INSTANCE_ID],
  );
  // やり直しでは新しい linkToken を発行し直す。
  assert.equal(requests.length, 2);
  assert.equal(listeners.size, 0);
});

test("instance_mismatch is not retried more than once", async (t) => {
  restoreGlobalsAfter(t);
  const { messages, listeners } = installExtensionWindow(CURRENT_INSTANCE_ID, {
    respondToLink: (message, reply) =>
      reply(
        linkResult(message, {
          ok: false,
          linked: false,
          reason: "instance_mismatch",
        }),
      ),
  });
  installLinkTokenFetch();

  await assert.rejects(
    linkExtensionToCurrentUserFromUserAction(),
    (error) =>
      error instanceof ExtensionLinkError &&
      error.reason === "instance_mismatch",
  );
  assert.equal(linkMessagesOf(messages).length, 2);
  assert.equal(listeners.size, 0);
});

test("no result from the extension times out after 20 seconds and removes its listener", async (t) => {
  restoreGlobalsAfter(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let linkPosted;
  const posted = new Promise((resolve) => {
    linkPosted = resolve;
  });
  const { listeners } = installExtensionWindow(CURRENT_INSTANCE_ID, {
    respondToLink: () => linkPosted(),
  });
  installLinkTokenFetch();

  let settled = false;
  const pending = linkExtensionToCurrentUserFromUserAction();
  pending.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );

  await posted;
  assert.equal(listeners.size, 1);

  t.mock.timers.tick(LINK_RESULT_TIMEOUT_MS - 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);

  t.mock.timers.tick(1);
  await assert.rejects(
    pending,
    (error) =>
      error instanceof ExtensionLinkError && error.reason === "no_response",
  );
  assert.equal(listeners.size, 0);
});
