'use client';

import { useEffect } from 'react';

const CHECK_TIMEOUT_MS = 1000;

type ExtensionAuthStatus = {
  available: boolean;
  loggedIn: boolean;
  extensionInstanceId: string | null;
};

function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function checkExtensionAuthStatus(): Promise<ExtensionAuthStatus> {
  return new Promise((resolve) => {
    const requestId = createRequestId();
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve({ available: false, loggedIn: false, extensionInstanceId: null });
    }, CHECK_TIMEOUT_MS);

    function handler(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'EXTENSION_AUTH_STATUS') {
        if (event.data.requestId !== requestId) return;
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        resolve({
          available: true,
          loggedIn: Boolean(event.data.loggedIn),
          extensionInstanceId:
            typeof event.data.extensionInstanceId === 'string'
              ? event.data.extensionInstanceId
              : null,
        });
      }
    }

    window.addEventListener('message', handler);
    window.postMessage(
      { type: 'EXTENSION_CHECK_AUTH', requestId },
      window.location.origin
    );
  });
}

export function ExtensionLinker() {
  useEffect(() => {
    async function maybeLink() {
      const status = await checkExtensionAuthStatus();
      if (!status.available || status.loggedIn) return;
      if (!status.extensionInstanceId) return;

      const res = await fetch('/api/extension/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensionInstanceId: status.extensionInstanceId,
        }),
      });
      if (!res.ok) return;
      const { token } = await res.json();
      window.postMessage(
        {
          type: 'EXT_LINK_WITH_AUTH_TOKEN',
          requestId: createRequestId(),
          extensionInstanceId: status.extensionInstanceId,
          token,
        },
        window.location.origin
      );
    }

    maybeLink();
  }, []);

  return null;
}
