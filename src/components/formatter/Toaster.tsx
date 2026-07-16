import { useEffect } from 'react';
import { clsx } from 'clsx';
import { useStore, type Toast } from '@store/index';
import { AlertIcon, CheckIcon, InfoIcon } from './icons';

const DURATION_MS = 3800;

function Row({ toast }: { toast: Toast }): JSX.Element {
  const dismiss = useStore((s) => s.dismissToast);
  useEffect(() => {
    const h = window.setTimeout(() => dismiss(toast.id), DURATION_MS);
    return () => window.clearTimeout(h);
  }, [toast.id, dismiss]);
  const Icon = toast.kind === 'success' ? CheckIcon : toast.kind === 'error' ? AlertIcon : InfoIcon;
  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={clsx(
        'pointer-events-auto flex items-start gap-2 rounded-lg border bg-elevated px-3 py-2 text-sm shadow-pop animate-slide-up',
        toast.kind === 'success' && 'border-success/40',
        toast.kind === 'error' && 'border-danger/40',
        toast.kind === 'info' && 'border-border',
      )}
    >
      <Icon
        className={clsx(
          'mt-0.5 h-4 w-4 shrink-0',
          toast.kind === 'success' && 'text-success',
          toast.kind === 'error' && 'text-danger',
          toast.kind === 'info' && 'text-subtle',
        )}
      />
      <span className="flex-1 text-fg">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="text-subtle hover:text-fg"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export function Toaster(): JSX.Element {
  const toasts = useStore((s) => s.toasts);
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-40 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <Row key={t.id} toast={t} />
      ))}
    </div>
  );
}
