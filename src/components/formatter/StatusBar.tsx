import { clsx } from 'clsx';
import type { JsonError, JsonStats } from '@lib/json/types';
import { formatBytes, formatCount } from '@lib/format-bytes';
import { AlertIcon, CheckIcon, InfoIcon } from './icons';

interface Props {
  status: 'idle' | 'parsing' | 'valid' | 'invalid';
  error: JsonError | null;
  stats: JsonStats | null;
  indent: 2 | 4 | '\t';
}

export function StatusBar({ status, error, stats, indent }: Props): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-3 text-xs"
    >
      <div className="flex items-center gap-2 min-w-0">
        <StatusPill status={status} />
        {status === 'invalid' && error && (
          <div className="flex min-w-0 items-center gap-2 truncate text-danger">
            <span className="font-mono">
              Line {error.line}:{error.column}
            </span>
            <span className="truncate">{error.message}</span>
            {error.suggestion && (
              <span className="hidden truncate text-subtle sm:inline">
                — {error.suggestion}
              </span>
            )}
          </div>
        )}
        {status === 'valid' && stats && (
          <div className="hidden items-center gap-3 text-subtle md:flex">
            <span>{formatCount(stats.keys)} keys</span>
            <span>{formatCount(stats.depth)} depth</span>
            <span>{formatBytes(stats.bytes)}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 text-subtle">
        <span aria-label="Indentation">
          Indent: {indent === '\t' ? 'Tab' : `${indent} spaces`}
        </span>
        <span className="hidden md:inline">UTF-8</span>
        <span className="hidden md:inline">RFC 8259</span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Props['status'] }): JSX.Element {
  if (status === 'valid') {
    return (
      <span className="chip border-success/40 bg-success/10 text-success">
        <CheckIcon className="h-3.5 w-3.5" /> Valid JSON
      </span>
    );
  }
  if (status === 'invalid') {
    return (
      <span className="chip border-danger/40 bg-danger/10 text-danger">
        <AlertIcon className="h-3.5 w-3.5" /> Invalid
      </span>
    );
  }
  if (status === 'parsing') {
    return (
      <span className={clsx('chip', 'animate-pulse')}>
        <InfoIcon className="h-3.5 w-3.5" /> Parsing…
      </span>
    );
  }
  return (
    <span className="chip">
      <InfoIcon className="h-3.5 w-3.5" /> Ready
    </span>
  );
}
