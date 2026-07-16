import { useRef } from 'react';
import { clsx } from 'clsx';
import type { FormatOptions, IndentOption } from '@lib/json/types';
import {
  CopyIcon, DownloadIcon, MinifyIcon, SettingsIcon, TrashIcon, UploadIcon,
  WandIcon, KeyboardIcon, CommandIcon,
} from './icons';
import { modKey } from '@lib/shortcuts';

interface Props {
  options: FormatOptions;
  onOptionsChange: (patch: Partial<FormatOptions>) => void;
  onFormat: () => void;
  onMinify: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onUpload: (file: File) => void;
  onClear: () => void;
  onOpenPalette: () => void;
  onOpenHelp: () => void;
  canAct: boolean;
}

export function Toolbar(p: Props): JSX.Element {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2"
      role="toolbar"
      aria-label="JSON actions"
    >
      <button
        type="button"
        onClick={p.onFormat}
        className="btn-primary"
        disabled={!p.canAct}
        aria-keyshortcuts={`${modKey}+Enter`}
      >
        <WandIcon />
        <span>Format</span>
        <kbd className="kbd-hint">{modKey} ⏎</kbd>
      </button>

      <button
        type="button"
        onClick={p.onMinify}
        className="btn"
        disabled={!p.canAct}
        aria-keyshortcuts={`${modKey}+⇧+M`}
      >
        <MinifyIcon />
        <span>Minify</span>
      </button>

      <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

      <IndentSelect
        value={p.options.indent}
        onChange={(indent) => p.onOptionsChange({ indent })}
      />

      <TransformMenu options={p.options} onChange={p.onOptionsChange} />

      <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

      <button type="button" onClick={p.onCopy} className="btn" disabled={!p.canAct}>
        <CopyIcon /> <span>Copy</span>
      </button>
      <button type="button" onClick={p.onDownload} className="btn" disabled={!p.canAct}>
        <DownloadIcon /> <span>Download</span>
      </button>

      <button type="button" onClick={() => fileRef.current?.click()} className="btn">
        <UploadIcon /> <span>Upload</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.jsonc,.ndjson,.txt,application/json,text/plain"
        className="hidden"
        aria-label="Upload JSON file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) p.onUpload(file);
          e.target.value = '';
        }}
      />

      <button type="button" onClick={p.onClear} className="btn-ghost" aria-label="Clear editor">
        <TrashIcon /> <span className="hidden sm:inline">Clear</span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={p.onOpenPalette} className="btn-ghost" aria-label="Open command palette">
          <CommandIcon />
          <span className="hidden sm:inline">Palette</span>
          <kbd className="kbd-hint">{modKey} K</kbd>
        </button>
        <button type="button" onClick={p.onOpenHelp} className="btn-icon" aria-label="Keyboard shortcuts">
          <KeyboardIcon />
        </button>
      </div>
    </div>
  );
}

function IndentSelect({
  value,
  onChange,
}: {
  value: IndentOption;
  onChange: (v: IndentOption) => void;
}): JSX.Element {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-subtle">
      <span className="sr-only">Indentation</span>
      <select
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const next: IndentOption = raw === 'tab' ? '\t' : (Number(raw) as 2 | 4);
          onChange(next);
        }}
        className="h-8 rounded-md border border-border bg-surface px-2 pr-6 text-sm text-fg"
        aria-label="Indent size"
      >
        <option value="2">2 spaces</option>
        <option value="4">4 spaces</option>
        <option value="tab">Tab</option>
      </select>
    </label>
  );
}

function TransformMenu({
  options,
  onChange,
}: {
  options: FormatOptions;
  onChange: (patch: Partial<FormatOptions>) => void;
}): JSX.Element {
  return (
    <details className="group relative">
      <summary
        className="btn cursor-pointer list-none [&::-webkit-details-marker]:hidden"
        aria-label="Transform options"
      >
        <SettingsIcon />
        <span className="hidden sm:inline">Transforms</span>
      </summary>
      <div
        className={clsx(
          'absolute left-0 top-10 z-30 w-64 space-y-2 rounded-lg border border-border bg-elevated p-3 shadow-pop',
          'animate-slide-up',
        )}
        role="group"
        aria-label="Formatting transforms"
      >
        <ToggleRow
          checked={options.sortKeys}
          onChange={(v) => onChange({ sortKeys: v })}
          label="Sort object keys"
          hint="Alphabetical, recursive."
        />
        <ToggleRow
          checked={options.stripNull}
          onChange={(v) => onChange({ stripNull: v })}
          label="Remove null values"
        />
        <ToggleRow
          checked={options.stripEmpty}
          onChange={(v) => onChange({ stripEmpty: v })}
          label="Remove empty values"
          hint='Empty strings, {}, [].'
        />
        <ToggleRow
          checked={options.decodeUnicode}
          onChange={(v) => onChange({ decodeUnicode: v })}
          label="Decode \\uXXXX escapes"
        />
      </div>
    </details>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}): JSX.Element {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]"
      />
      <span className="flex-1">
        <span className="block text-fg">{label}</span>
        {hint && <span className="block text-xs text-subtle">{hint}</span>}
      </span>
    </label>
  );
}
