import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@store/index';
import { useJsonWorker } from '@hooks/useWorker';
import { useDebouncedEffect } from '@hooks/useDebouncedEffect';
import { useHotkeys } from '@hooks/useHotkeys';
import { useThemeSync } from '@hooks/useTheme';
import { copyToClipboard } from '@lib/clipboard';
import { downloadText } from '@lib/download';
import { readTextFile, SOFT_WARN_BYTES } from '@lib/upload';
import type { WorkerRequest, WorkerResponse } from '@workers/protocol';
import { Toolbar } from './Toolbar';
import { EditorPane } from './EditorPane';
import { OutputPanel } from './OutputPanel';
import { FormattedView } from './FormattedView';
import { TreeView } from './TreeView';
import { DiffView } from './DiffView';
import { StatsPanel } from './StatsPanel';
import { StatusBar } from './StatusBar';
import { Toaster } from './Toaster';
import { CommandPalette, HelpSheet, type PaletteCommand } from './CommandPalette';

const SAMPLE = `{
  "app": "JSON Formatter Pro",
  "version": "1.0.0",
  "features": ["format", "validate", "minify", "tree", "diff", "stats"],
  "author": {
    "name": "You",
    "email": "you@example.com"
  },
  "flags": {
    "private": true,
    "offline": true,
    "telemetry": false
  }
}`;

export function FormatterApp(): JSX.Element {
  useThemeSync();

  const {
    input, formatted, value, error, status, stats,
    mode, options, paletteOpen, helpOpen,
    setInput, setFormatted, setValue, setError, setStatus, setStats,
    setMode, setOptions, togglePalette, toggleHelp,
    pushToast, clear,
  } = useStore();

  const nextId = useRef(1);
  const lastRequestId = useRef(0);

  const onWorkerMessage = useCallback((msg: WorkerResponse) => {
    if (msg.id !== lastRequestId.current) return;
    if (msg.kind === 'process') {
      if (msg.ok) {
        setFormatted(msg.formatted);
        setValue(msg.value);
        setStats(msg.stats);
        setError(null);
        setStatus('valid');
      } else {
        setError(msg.error);
        setStatus('invalid');
        setStats(null);
        setValue(null);
      }
    } else if (msg.kind === 'minify') {
      if (msg.ok) {
        setFormatted(msg.minified);
        setStatus('valid');
        setError(null);
        pushToast({ kind: 'success', message: 'Minified.' });
      } else {
        setError(msg.error);
        setStatus('invalid');
        pushToast({ kind: 'error', message: 'Cannot minify: JSON is invalid.' });
      }
    }
  }, [setFormatted, setValue, setStats, setError, setStatus, pushToast]);

  const worker = useJsonWorker(onWorkerMessage);

  const sendProcess = useCallback(() => {
    const id = ++nextId.current;
    lastRequestId.current = id;
    const raw = useStore.getState().input;
    const opts = useStore.getState().options;
    if (raw.trim().length === 0) {
      setFormatted('');
      setValue(null);
      setStats(null);
      setError(null);
      setStatus('idle');
      return;
    }
    setStatus('parsing');
    const req: WorkerRequest = { id, kind: 'process', raw, options: opts };
    worker.send(req);
  }, [worker, setFormatted, setValue, setStats, setError, setStatus]);

  // Auto-parse on input / option changes (debounced).
  useDebouncedEffect(sendProcess, [input, options], 160);

  // Seed sample on very first load if store is empty.
  useEffect(() => {
    if (useStore.getState().input === '') {
      setInput(SAMPLE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doFormat = useCallback(() => {
    const raw = useStore.getState().input;
    if (raw.trim().length === 0) return;
    // Re-run processing immediately (bypasses the input debounce) so the right
    // panel reflects the latest input/options. The input itself is never mutated.
    sendProcess();
    setMode('formatted');
  }, [sendProcess, setMode]);

  const doMinify = useCallback(() => {
    const raw = useStore.getState().input;
    if (raw.trim().length === 0) return;
    const id = ++nextId.current;
    lastRequestId.current = id;
    worker.send({ id, kind: 'minify', raw });
    setMode('formatted');
  }, [worker, setMode]);

  const doCopy = useCallback(async () => {
    const text = useStore.getState().formatted || useStore.getState().input;
    if (!text) return;
    const ok = await copyToClipboard(text);
    pushToast({
      kind: ok ? 'success' : 'error',
      message: ok ? 'Copied to clipboard.' : 'Copy failed.',
    });
  }, [pushToast]);

  const doDownload = useCallback(() => {
    const text = useStore.getState().formatted || useStore.getState().input;
    if (!text) return;
    downloadText('formatted.json', text);
    pushToast({ kind: 'success', message: 'Download started.' });
  }, [pushToast]);

  const doUpload = useCallback(async (file: File) => {
    if (file.size > SOFT_WARN_BYTES) {
      const proceed = window.confirm(
        `This file is ${(file.size / 1_000_000).toFixed(1)} MB. Large files may briefly freeze the UI. Continue?`,
      );
      if (!proceed) return;
    }
    const res = await readTextFile(file);
    if (!res.ok) {
      pushToast({ kind: 'error', message: res.message });
      return;
    }
    setInput(res.text);
    pushToast({ kind: 'success', message: `Loaded ${res.name}.` });
  }, [pushToast, setInput]);

  const doClear = useCallback(() => {
    if (useStore.getState().input.length > 5000) {
      const ok = window.confirm('Clear the current buffer? This cannot be undone.');
      if (!ok) return;
    }
    clear();
  }, [clear]);

  const commands: PaletteCommand[] = useMemo(
    () => [
      { id: 'format', label: 'Format / Beautify', run: doFormat, hint: 'Pretty-print the JSON' },
      { id: 'minify', label: 'Minify', run: doMinify },
      { id: 'copy', label: 'Copy output', run: doCopy },
      { id: 'download', label: 'Download JSON', run: doDownload },
      { id: 'clear', label: 'Clear editor', run: doClear },
      { id: 'tab-formatted', label: 'Show Formatted view', run: () => setMode('formatted') },
      { id: 'tab-tree', label: 'Show Tree view', run: () => setMode('tree') },
      { id: 'tab-diff', label: 'Show Diff view', run: () => setMode('diff') },
      { id: 'tab-stats', label: 'Show Stats view', run: () => setMode('stats') },
      { id: 'sort', label: 'Toggle: Sort keys', run: () => setOptions({ sortKeys: !options.sortKeys }) },
      { id: 'strip-null', label: 'Toggle: Remove nulls', run: () => setOptions({ stripNull: !options.stripNull }) },
      { id: 'strip-empty', label: 'Toggle: Remove empty', run: () => setOptions({ stripEmpty: !options.stripEmpty }) },
      { id: 'indent-2', label: 'Indent: 2 spaces', run: () => setOptions({ indent: 2 }) },
      { id: 'indent-4', label: 'Indent: 4 spaces', run: () => setOptions({ indent: 4 }) },
      { id: 'indent-tab', label: 'Indent: Tab', run: () => setOptions({ indent: '\t' }) },
      { id: 'help', label: 'Keyboard shortcuts', run: () => toggleHelp(true) },
    ],
    [doFormat, doMinify, doCopy, doDownload, doClear, setMode, setOptions, options.sortKeys, options.stripNull, options.stripEmpty, toggleHelp],
  );

  useHotkeys((id) => {
    switch (id) {
      case 'format': return doFormat();
      case 'minify': return doMinify();
      case 'copy': return void doCopy();
      case 'download': return doDownload();
      case 'clear': return doClear();
      case 'palette': return togglePalette(true);
      case 'help': return toggleHelp(true);
      case 'tab-formatted': return setMode('formatted');
      case 'tab-tree': return setMode('tree');
      case 'tab-diff': return setMode('diff');
      case 'tab-stats': return setMode('stats');
    }
  });

  const canAct = input.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        options={options}
        onOptionsChange={setOptions}
        onFormat={doFormat}
        onMinify={doMinify}
        onCopy={() => void doCopy()}
        onDownload={doDownload}
        onUpload={(f) => void doUpload(f)}
        onClear={doClear}
        onOpenPalette={() => togglePalette(true)}
        onOpenHelp={() => toggleHelp(true)}
        canAct={canAct}
      />

      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-hidden bg-border lg:grid-cols-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) void doUpload(file);
        }}
      >
        <section aria-label="JSON input" className="flex min-h-[45vh] flex-col bg-surface lg:min-h-0">
          <header className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3 text-xs uppercase tracking-wide text-subtle">
            <span>Input</span>
            <span className="normal-case text-[11px] text-subtle">Paste, type, or drop a file</span>
          </header>
          <div className="min-h-0 flex-1">
            <EditorPane
              value={input}
              onChange={setInput}
              error={error}
              ariaLabel="JSON input editor"
            />
          </div>
        </section>

        <section aria-label="Output" className="flex min-h-[45vh] flex-col bg-surface lg:min-h-0">
          <OutputPanel mode={mode} onModeChange={setMode}>
            {mode === 'formatted' && (
              <FormattedView
                value={formatted}
                ariaLabel="Formatted JSON"
                emptyLabel="Formatted output will appear here."
              />
            )}
            {mode === 'tree' && <TreeView root={value} />}
            {mode === 'diff' && <DiffView original={input} modified={formatted} />}
            {mode === 'stats' && <StatsPanel stats={stats} />}
          </OutputPanel>
        </section>
      </div>

      <StatusBar
        status={status}
        error={error}
        stats={stats}
        indent={options.indent}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => togglePalette(false)}
        commands={commands}
      />
      <HelpSheet open={helpOpen} onClose={() => toggleHelp(false)} />
      <Toaster />
    </div>
  );
}
