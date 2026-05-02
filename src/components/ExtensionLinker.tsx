'use client';

import { useEffect } from 'react';

const CHECK_TIMEOUT_MS = 1000;

type ExtensionAuthStatus = {
  available: boolean;
  loggedIn: boolean;
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
      resolve({ available: false, loggedIn: false });
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

      const res = await fetch('/api/extension/link-token', { method: 'POST' });
      if (!res.ok) return;
      const { linkToken } = await res.json();
      window.postMessage(
        { type: 'EXT_LINK_WITH_TOKEN', requestId: createRequestId(), linkToken },
        window.location.origin
      );
    }

    maybeLink();
  }, []);

  return null;
}
