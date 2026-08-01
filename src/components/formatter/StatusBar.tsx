import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { clsx } from 'clsx';
import type { IndentOption, JsonError, JsonSpec, JsonStats } from '@lib/json/types';
import { JSON_SPEC_LABELS } from '@lib/json/types';
import type { OutputMode, Status } from '@store/index';
import { formatBytes, formatCount } from '@lib/format-bytes';
import { inputFormatFor } from './input-formats';
import { AlertIcon, CheckIcon, InfoIcon } from './icons';

interface Props {
  status: Status;
  error: JsonError | null;
  stats: JsonStats | null;
  indent: IndentOption;
  spec: JsonSpec;
  mode: OutputMode;
  input: string;
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

export function StatusBar({ status, error, stats, indent, spec, mode, input }: Props): JSX.Element {
  // Append the selected spec to the "Valid JSON" pill so users can see which
  // rule set the parse passed. "Skip Validation" isn't a spec, so we keep the
  // pill plain in that case.
  const validLabel =
    spec === 'SKIP' ? 'Valid JSON' : `Valid JSON (${JSON_SPEC_LABELS[spec]})`;

  // A JWT — or a CSV/YAML/XML paste on a reverse-converter page — is never
  // valid JSON on its own, so the generic JSON worker's status/error (computed
  // unconditionally in FormatterApp, mode-agnostic) would permanently show a
  // misleading "Invalid" pill even for perfectly well-formed input. For those
  // modes the input-format registry supplies the right validator and this bar
  // reports against it instead; the tool's own panel still owns the details
  // (JWT expiry, converter output), this bar only reports validity.
  const format = inputFormatFor(mode);
  const result = useMemo(
    () => (format.validate ? format.validate(input) : null),
    [format, input],
  );
  const effectiveStatus: Status = result
    ? input.trim() === ''
      ? 'idle'
      : result.ok
        ? 'valid'
        : 'invalid'
    : status;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-3 text-xs"
    >
      <div className="flex items-center gap-2 min-w-0">
        <StatusPill
          status={effectiveStatus}
          validLabel={result ? `Valid ${format.label}` : validLabel}
          invalidLabel={result ? `Invalid ${format.label}` : undefined}
        />
        {result
          ? !result.ok &&
            input.trim() !== '' && (
              <div className="flex min-w-0 items-center gap-2 truncate text-danger">
                <span className="truncate">{result.error}</span>
              </div>
            )
          : (
            <>
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
            </>
          )}
      </div>
      <div className="flex items-center gap-3 text-subtle">
        <span>
          <span className="sr-only">Indentation: </span>
          Indent: {indent === '\t' ? 'Tab' : `${indent} spaces`}
        </span>
        <span className="hidden md:inline">UTF-8</span>
        <span className="hidden md:inline">{JSON_SPEC_LABELS[spec]}</span>
      </div>
    </div>
  );
}

function StatusPill({
  status,
  validLabel,
  invalidLabel,
}: {
  status: Status;
  validLabel: string;
  invalidLabel?: string;
}): JSX.Element {
  // Falls back to the idle pill so an unexpected status renders rather than throws.
  const pill = PILLS[status] ?? IDLE_PILL;
  const { icon: Icon, className } = pill;
  const label =
    status === 'valid'
      ? validLabel
      : status === 'invalid' && invalidLabel
        ? invalidLabel
        : pill.label;
  return (
    <span className={clsx('chip', className)}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}
