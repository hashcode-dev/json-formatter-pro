import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore, type OutputMode } from '@store/index';
import { useJsonWorker } from '@hooks/useWorker';
import { useDebouncedEffect } from '@hooks/useDebouncedEffect';
import { useHotkeys } from '@hooks/useHotkeys';
import { useThemeSync } from '@hooks/useTheme';
import { useCopyWithToast } from '@hooks/useCopyWithToast';
import { downloadText } from '@lib/download';
import { readTextFile, SOFT_WARN_BYTES } from '@lib/upload';
import { formatBytes } from '@lib/format-bytes';
import type { WorkerRequest, WorkerResponse } from '@workers/protocol';
import { Toolbar } from './Toolbar';
import { EditorPane } from './EditorPane';
import { OutputPanel } from './OutputPanel';
import { FormattedView } from './FormattedView';
import { TreeView } from './TreeView';
import { StatsPanel } from './StatsPanel';
import { StatusBar } from './StatusBar';
import { Toaster } from './Toaster';
import { CommandPalette, HelpSheet, type PaletteCommand } from './CommandPalette';
import { ConvertersPane, isConverterMode } from '@components/tools/ConvertersPane';
import { JwtInspector } from '@components/tools/JwtInspector';

const SAMPLE = `{
  "app": "JSON Formatter Pro",
  "version": "1.0.0",
  "features": ["format", "validate", "minify", "tree", "stats", "converters", "jwt"],
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

/** Text the Copy and Download actions operate on. */
function readOutputText(): string {
  const { formatted, input } = useStore.getState();
  return formatted || input;
}

/** Raw input, or null when there is nothing worth acting on. */
function readInput(): string | null {
  const raw = useStore.getState().input;
  return raw.trim().length === 0 ? null : raw;
}

interface FormatterAppProps {
  initialMode?: OutputMode;
}

export function FormatterApp({ initialMode }: FormatterAppProps = {}): JSX.Element {
  useThemeSync();

  const {
    input, formatted, value, error, status, stats,
    mode, activeTool, options, paletteOpen, helpOpen,
    setInput, setFormatted, setValue, setError, setStatus, setStats,
    setMode, initMode, closeTool, setOptions, togglePalette, toggleHelp,
    pushToast, clear,
  } = useStore();

  const copyWithToast = useCopyWithToast();

  useEffect(() => {
    if (initialMode) {
      initMode(initialMode);
    }
  }, [initialMode, initMode]);

  const nextId = useRef(1);
  const lastRequestId = useRef(0);

  /** Claim the next request id and mark it as the only one worth rendering. */
  const nextRequestId = useCallback((): number => {
    const id = ++nextId.current;
    lastRequestId.current = id;
    return id;
  }, []);

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
    const id = nextRequestId();
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
  }, [worker, nextRequestId, setFormatted, setValue, setStats, setError, setStatus]);

  useDebouncedEffect(sendProcess, [input, options], 160);

  useEffect(() => {
    if (useStore.getState().input === '') {
      setInput(SAMPLE);
    }
  }, [setInput]);

  // Listen for tool select events from the Header's Tools dropdown.
  useEffect(() => {
    const handleToolSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: OutputMode }>;
      if (customEvent.detail && customEvent.detail.mode) {
        setMode(customEvent.detail.mode);
      }
    };
    window.addEventListener('json-tool-select', handleToolSelect);
    return () => window.removeEventListener('json-tool-select', handleToolSelect);
  }, [setMode]);

  const doFormat = useCallback(() => {
    if (readInput() === null) return;
    sendProcess();
    setMode('formatted');
  }, [sendProcess, setMode]);

  const doMinify = useCallback(() => {
    const raw = readInput();
    if (raw === null) return;
    worker.send({ id: nextRequestId(), kind: 'minify', raw });
    setMode('formatted');
  }, [worker, nextRequestId, setMode]);

  const doCopy = useCallback(async () => {
    const text = readOutputText();
    if (!text) return;
    await copyWithToast(text, {
      success: 'Copied to clipboard.',
      error: 'Copy failed.',
    });
  }, [copyWithToast]);

  const doDownload = useCallback(() => {
    const text = readOutputText();
    if (!text) return;
    downloadText('formatted.json', text);
    pushToast({ kind: 'success', message: 'Download started.' });
  }, [pushToast]);

  const doUpload = useCallback(async (file: File) => {
    if (file.size > SOFT_WARN_BYTES) {
      const proceed = window.confirm(
        `This file is ${formatBytes(file.size)}. Large files may briefly freeze the UI. Continue?`,
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
      { id: 'copy', label: 'Copy output', run: () => void doCopy() },
      { id: 'download', label: 'Download JSON', run: doDownload },
      { id: 'clear', label: 'Clear editor', run: doClear },
      { id: 'tab-formatted', label: 'Show Formatted view', run: () => setMode('formatted') },
      { id: 'tab-tree', label: 'Show Tree view', run: () => setMode('tree') },
      { id: 'tab-stats', label: 'Show Stats view', run: () => setMode('stats') },
      { id: 'tool-yaml', label: 'Convert to YAML', run: () => setMode('yaml') },
      { id: 'tool-xml', label: 'Convert to XML', run: () => setMode('xml') },
      { id: 'tool-csv', label: 'Convert to CSV', run: () => setMode('csv') },
      { id: 'tool-ts', label: 'Convert to TypeScript Types', run: () => setMode('typescript') },
      { id: 'tool-schema', label: 'Generate JSON Schema', run: () => setMode('schema') },
      { id: 'tool-jwt', label: 'Inspect JWT Token', run: () => setMode('jwt') },
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

  /**
   * Hotkeys reuse the palette's actions by id. `palette` is handled separately
   * because it is deliberately not a palette entry — listing it would show a
   * "Command palette" row inside the palette itself.
   */
  const runById = useMemo(
    () => new Map(commands.map((c) => [c.id, c.run])),
    [commands],
  );

  useHotkeys(
    useCallback(
      (id) => {
        if (id === 'palette') {
          togglePalette(true);
          return;
        }
        runById.get(id)?.();
      },
      [runById, togglePalette],
    ),
  );

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
          <OutputPanel
            mode={mode}
            activeTool={activeTool}
            onModeChange={setMode}
            onCloseTool={closeTool}
          >
            {mode === 'formatted' && (
              <FormattedView
                value={formatted}
                ariaLabel="Formatted JSON"
                emptyLabel="Formatted output will appear here."
              />
            )}
            {mode === 'tree' && <TreeView root={value} />}
            {mode === 'stats' && <StatsPanel stats={stats} />}
            {isConverterMode(mode) && <ConvertersPane type={mode} />}
            {mode === 'jwt' && <JwtInspector />}
          </OutputPanel>
        </section>
      </div>

      <StatusBar
        status={status}
        error={error}
        stats={stats}
        indent={options.indent}
        spec={options.spec}
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
