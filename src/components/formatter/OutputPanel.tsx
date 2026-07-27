import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { CoreMode, OutputMode, ToolMode } from '@store/index';
import { CloseIcon, PlusIcon, StatsIcon, TreeIcon, WandIcon } from './icons';

interface Props {
  mode: OutputMode;
  activeTool: ToolMode | null;
  onModeChange: (m: OutputMode) => void;
  onCloseTool: () => void;
  children: React.ReactNode;
}

interface TabDef<T extends OutputMode> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  tag?: string;
}

/** Always visible — shared by every tool. */
const CORE_TABS: Array<TabDef<CoreMode>> = [
  { id: 'formatted', label: 'Formatted', icon: WandIcon },
  { id: 'tree', label: 'Tree View', icon: TreeIcon },
  { id: 'stats', label: 'Stats', icon: StatsIcon },
];

/** Opt-in — at most one of these is on show at a time. */
const TOOL_TABS: Array<TabDef<ToolMode> & { group: string; hint: string }> = [
  { id: 'yaml', label: 'YAML', tag: 'CONVERT', group: 'Converters', hint: 'Clean YAML document' },
  { id: 'xml', label: 'XML', tag: 'CONVERT', group: 'Converters', hint: 'Structured XML output' },
  { id: 'csv', label: 'CSV', tag: 'CONVERT', group: 'Converters', hint: 'Tabular CSV / TSV' },
  { id: 'typescript', label: 'TypeScript', tag: 'TYPES', group: 'Types & Spec', hint: 'Typed TS interfaces' },
  { id: 'schema', label: 'Schema', tag: 'SPEC', group: 'Types & Spec', hint: 'Draft-07 JSON Schema' },
  { id: 'jwt', label: 'JWT Inspector', tag: 'SECURITY', group: 'Security', hint: 'Decode header & claims' },
];

const TOOL_GROUPS = ['Converters', 'Types & Spec', 'Security'];

export function OutputPanel({ mode, activeTool, onModeChange, onCloseTool, children }: Props): JSX.Element {
  const toolTab = TOOL_TABS.find((t) => t.id === activeTool);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center border-b border-border bg-surface">
        <div
          role="tablist"
          aria-label="Output views"
          className="flex min-w-0 flex-1 items-center gap-1 px-2 overflow-x-auto no-scrollbar"
        >
          {CORE_TABS.map((t) => (
            <Tab key={t.id} tab={t} active={mode === t.id} onSelect={() => onModeChange(t.id)} />
          ))}
          {toolTab && (
            <Tab
              key={toolTab.id}
              tab={toolTab}
              active={mode === toolTab.id}
              onSelect={() => onModeChange(toolTab.id)}
              onClose={onCloseTool}
            />
          )}
        </div>
        <AddToolMenu activeTool={activeTool} onSelect={(m) => onModeChange(m)} />
      </div>
      <div
        id={`panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`tab-${mode}`}
        className="min-h-0 flex-1 relative overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}

function Tab({
  tab,
  active,
  onSelect,
  onClose,
}: {
  tab: TabDef<OutputMode>;
  active: boolean;
  onSelect: () => void;
  onClose?: () => void;
}): JSX.Element {
  const Icon = tab.icon;
  return (
    <div className="relative flex shrink-0 items-center">
      <button
        id={`tab-${tab.id}`}
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls={`panel-${tab.id}`}
        onClick={onSelect}
        className={clsx(
          'inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors whitespace-nowrap',
          onClose && 'pr-7',
          active
            ? 'border-accent text-fg bg-bg/40 font-semibold'
            : 'border-transparent text-subtle hover:text-fg hover:bg-muted/40',
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{tab.label}</span>
        {tab.tag && !active && (
          <span className="rounded bg-muted/60 px-1 py-0.2 text-[9px] font-semibold text-subtle uppercase">
            {tab.tag}
          </span>
        )}
      </button>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${tab.label} tab`}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle hover:bg-muted hover:text-fg"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function AddToolMenu({
  activeTool,
  onSelect,
}: {
  activeTool: ToolMode | null;
  onSelect: (m: ToolMode) => void;
}): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const available = TOOL_TABS.filter((t) => t.id !== activeTool);
  if (available.length === 0) return null;

  return (
    <div ref={ref} className="relative shrink-0 px-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Add tool view"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-subtle hover:bg-muted/60 hover:text-fg transition-colors"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Tools</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Add a tool view"
          className="absolute right-0 top-9 z-30 w-64 space-y-2 rounded-lg border border-border bg-elevated p-2 shadow-pop animate-slide-up"
        >
          {TOOL_GROUPS.map((group) => {
            const items = available.filter((t) => t.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="space-y-0.5">
                <div className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-accent/90">
                  {group}
                </div>
                {items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelect(t.id);
                      setOpen(false);
                    }}
                    className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted/80 transition-colors"
                  >
                    <span className="block text-xs font-semibold text-fg">{t.label}</span>
                    <span className="block text-[11px] leading-tight text-subtle">{t.hint}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
