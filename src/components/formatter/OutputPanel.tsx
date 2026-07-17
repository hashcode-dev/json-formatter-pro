import { clsx } from 'clsx';
import type { OutputMode } from '@store/index';
import { StatsIcon, TreeIcon, WandIcon } from './icons';

interface Props {
  mode: OutputMode;
  onModeChange: (m: OutputMode) => void;
  children: React.ReactNode;
}

const TABS: Array<{ id: OutputMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'formatted', label: 'Formatted', icon: WandIcon },
  { id: 'tree', label: 'Tree', icon: TreeIcon },
  { id: 'stats', label: 'Stats', icon: StatsIcon },
];

export function OutputPanel({ mode, onModeChange, children }: Props): JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Output views"
        className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-2"
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
                'inline-flex h-9 items-center gap-1.5 border-b-2 px-3 text-sm transition-colors',
                active
                  ? 'border-accent text-fg'
                  : 'border-transparent text-subtle hover:text-fg',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      <div
        id={`panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`tab-${mode}`}
        className="min-h-0 flex-1"
      >
        {children}
      </div>
    </div>
  );
}
