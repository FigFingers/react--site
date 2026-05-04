'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkExtensionToCurrentUser } from '@/lib/extension/client';

type Status = 'idle' | 'loading' | 'success' | 'error';

function resolveErrorMessage(message: string): string {
  if (message === 'Extension response timeout') {
    return '拡張機能が応答しませんでした。インストールされているか確認してください。';
  }
  if (message === 'ExtensionAlreadyLinkedToAnotherUser') {
    return 'この拡張機能は別のアカウントに連携済みです。';
  }
  return `連携に失敗しました: ${message}`;
}

export function ExtensionLinkButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleClick() {
    setStatus('loading');
    setMessage('');

    try {
      await linkExtensionToCurrentUser();
      setStatus('success');
      setMessage('拡張機能の連携が完了しました。');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);

      if (errMsg === 'Unauthorized') {
        router.push('/login');
        return;
      }

      setStatus('error');
      setMessage(resolveErrorMessage(errMsg));
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={status === 'loading' || status === 'success'}
      >
        {status === 'loading'
          ? '連携中...'
          : status === 'success'
          ? '連携済み'
          : '拡張機能を連携する'}
      </button>
      {message && (
        <p style={{ color: status === 'success' ? 'green' : 'red' }}>
          {message}
        </p>
      )}
    </div>
  );
}
