import { useCallback } from 'react';
import { useStore } from '@store/index';
import { copyToClipboard } from '@lib/clipboard';

/**
 * Copy text and report the outcome as a toast. Messages are passed in rather
 * than templated here, because each call site words them differently.
 */
export function useCopyWithToast(): (
  text: string,
  messages: { success: string; error: string },
) => Promise<void> {
  const pushToast = useStore((s) => s.pushToast);

  return useCallback(
    async (text, messages) => {
      const ok = await copyToClipboard(text);
      pushToast({
        kind: ok ? 'success' : 'error',
        message: ok ? messages.success : messages.error,
      });
    },
    [pushToast],
  );
}
