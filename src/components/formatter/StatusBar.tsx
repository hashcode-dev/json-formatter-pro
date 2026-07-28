import type { ComponentType } from 'react';
import { clsx } from 'clsx';
import type { IndentOption, JsonError, JsonStats } from '@lib/json/types';
import type { Status } from '@store/index';
import { formatBytes, formatCount } from '@lib/format-bytes';
import { AlertIcon, CheckIcon, InfoIcon } from './icons';

interface Props {
  status: Status;
  error: JsonError | null;
  stats: JsonStats | null;
  indent: IndentOption;
}

interface PillDef {
  label: string;
  icon: ComponentType<{ className?: string }>;
  className?: string;
}

const PILLS: Record<Status, PillDef> = {
  valid: {
    label: 'Valid JSON',
    icon: CheckIcon,
    className: 'border-success/40 bg-success/10 text-success',
  },
  invalid: {
    label: 'Invalid',
    icon: AlertIcon,
    className: 'border-danger/40 bg-danger/10 text-danger',
  },
  parsing: { label: 'Parsing…', icon: InfoIcon, className: 'animate-pulse' },
  idle: { label: 'Ready', icon: InfoIcon },
};

const IDLE_PILL = PILLS.idle;

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
        <span>
          <span className="sr-only">Indentation: </span>
          Indent: {indent === '\t' ? 'Tab' : `${indent} spaces`}
        </span>
        <span className="hidden md:inline">UTF-8</span>
        <span className="hidden md:inline">RFC 8259</span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }): JSX.Element {
  // Falls back to the idle pill so an unexpected status renders rather than throws.
  const { label, icon: Icon, className } = PILLS[status] ?? IDLE_PILL;
  return (
    <span className={clsx('chip', className)}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}
