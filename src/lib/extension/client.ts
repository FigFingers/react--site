const TIMEOUT_MS = 3000;
// The extension background waits up to 15s for /api/extension/link.
const LINK_RESULT_TIMEOUT_MS = 20_000;

export const EXTENSION_LINK_NO_RESPONSE = "no_response";

export class ExtensionLinkError extends Error {
  readonly reason: string;
  readonly status: number | null;

  constructor(reason: string, status: number | null = null) {
    super(`Extension link failed: ${reason}`);
    this.name = "ExtensionLinkError";
    this.reason = reason;
    this.status = status;
  }
}

type ExtensionLinkResult = {
  ok?: unknown;
  linked?: unknown;
  reason?: unknown;
  status?: unknown;
};

function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function getExtensionInstanceIdFromExtension(): Promise<string> {
  const requestId = createRequestId();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Extension response timeout"));
    }, TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.type !== "EXTENSION_INSTANCE_ID_RESPONSE") return;
      if (data.requestId !== requestId) return;

      window.clearTimeout(timeout);
      window.removeEventListener("message", handler);

      if (!data.ok || !data.extensionInstanceId) {
        reject(new Error(data.message || "Failed to get extensionInstanceId"));
        return;
      }

      resolve(data.extensionInstanceId);
    };

    window.addEventListener("message", handler);
    window.postMessage(
      { type: "GET_EXTENSION_INSTANCE_ID", requestId },
      window.location.origin,
    );
  });
}

// Only the one-time linkToken passes through the page. The extension background
// exchanges it for the auth token and replies with the outcome only.
function requestLinkFromExtension(
  extensionInstanceId: string,
  linkToken: string,
): Promise<ExtensionLinkResult | null> {
  const requestId = createRequestId();

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(null);
    }, LINK_RESULT_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.type !== "EXTENSION_LINK_RESULT") return;
      if (data.requestId !== requestId) return;

      window.clearTimeout(timeout);
      window.removeEventListener("message", handler);
      resolve(data);
    };

    window.addEventListener("message", handler);
    window.postMessage(
      {
        type: "EXT_LINK_WITH_LINK_TOKEN",
        requestId,
        extensionInstanceId,
        linkToken,
      },
      window.location.origin,
    );
  });
}

async function requestLinkToken() {
  const res = await fetch("/api/extension/link-token", {
    method: "POST",
    credentials: "include",
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message || "Failed to issue extension link token");
  }

  return body as { linkToken: string; expiresAt: string };
}

async function linkWithLinkToken() {
  const extensionInstanceId = await getExtensionInstanceIdFromExtension();
  const { linkToken } = await requestLinkToken();
  const result = await requestLinkFromExtension(extensionInstanceId, linkToken);

  if (!result) throw new ExtensionLinkError(EXTENSION_LINK_NO_RESPONSE);
  if (result.ok !== true || result.linked !== true) {
    throw new ExtensionLinkError(
      typeof result.reason === "string" ? result.reason : "link_failed",
      typeof result.status === "number" && Number.isInteger(result.status)
        ? result.status
        : null,
    );
  }

  return { extensionInstanceId };
}

/**
 * This must stay behind a direct user action. A revoked link is durable server
 * state; issuing a new link token during page mount would silently undo unlink.
 */
export async function linkExtensionToCurrentUserFromUserAction() {
  try {
    return await linkWithLinkToken();
  } catch (error) {
    // The extension's instance id changed after it was read; read it again once.
    if (
      error instanceof ExtensionLinkError &&
      error.reason === "instance_mismatch"
    ) {
      return linkWithLinkToken();
    }
    throw error;
  }
}

export async function unlinkExtensionFromCurrentUser(
  linkedExtensionId: number,
  expectedExtensionInstanceId: string,
) {
  const res = await fetch("/api/extension/unlink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ linkedExtensionId }),
  });

  const body = (await res.json()) as {
    extensionInstanceId?: unknown;
    message?: unknown;
  };
  if (!res.ok) {
    throw new Error(
      typeof body.message === "string"
        ? body.message
        : "Failed to unlink extension",
    );
  }

  const extensionInstanceId =
    typeof body.extensionInstanceId === "string"
      ? body.extensionInstanceId
      : expectedExtensionInstanceId;

  // The extension only clears its local token when this instance id matches.
  // Unlinking a different browser therefore cannot log out the current one.
  window.postMessage(
    {
      type: "EXTENSION_UNLINKED",
      requestId: createRequestId(),
      extensionInstanceId,
    },
    window.location.origin,
  );

  return { extensionInstanceId };
}
