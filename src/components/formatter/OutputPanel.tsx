import { clsx } from 'clsx';
import type { OutputMode } from '@store/index';
import { StatsIcon, TreeIcon, WandIcon } from './icons';

interface Props {
  mode: OutputMode;
  onModeChange: (m: OutputMode) => void;
  children: React.ReactNode;
}

const TABS: Array<{ id: OutputMode; label: string; icon?: React.ComponentType<{ className?: string }>; tag?: string }> = [
  { id: 'formatted', label: 'Formatted', icon: WandIcon },
  { id: 'tree', label: 'Tree View', icon: TreeIcon },
  { id: 'stats', label: 'Stats', icon: StatsIcon },
  { id: 'yaml', label: 'YAML', tag: 'CONVERT' },
  { id: 'xml', label: 'XML', tag: 'CONVERT' },
  { id: 'csv', label: 'CSV', tag: 'CONVERT' },
  { id: 'typescript', label: 'TypeScript', tag: 'TYPES' },
  { id: 'schema', label: 'Schema', tag: 'SPEC' },
  { id: 'jwt', label: 'JWT Inspector', tag: 'SECURITY' },
];

export function OutputPanel({ mode, onModeChange, children }: Props): JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Output views"
        className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-2 overflow-x-auto no-scrollbar"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = mode === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              onClick={() => onModeChange(t.id)}
              className={clsx(
                'inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors whitespace-nowrap',
                active
                  ? 'border-accent text-fg bg-bg/40 font-semibold'
                  : 'border-transparent text-subtle hover:text-fg hover:bg-muted/40',
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{t.label}</span>
              {t.tag && !active && (
                <span className="rounded bg-muted/60 px-1 py-0.2 text-[9px] font-semibold text-subtle uppercase">
                  {t.tag}
                </span>
              )}
            </button>
          );
        })}
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
