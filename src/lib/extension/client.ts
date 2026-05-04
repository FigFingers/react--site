const TIMEOUT_MS = 3000;

export async function getExtensionInstanceIdFromExtension(): Promise<string> {
  const requestId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Extension response timeout"));
    }, TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
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
      window.location.origin
    );
  });
}

export async function linkExtensionToCurrentUser() {
  const extensionInstanceId = await getExtensionInstanceIdFromExtension();

  const res = await fetch("/api/extension/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ extensionInstanceId }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.message || "Failed to link extension");
  }

  return body as { ok: true; extensionInstanceId: string; userId: string };
}
