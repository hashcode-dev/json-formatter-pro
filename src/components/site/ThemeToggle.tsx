import { useStore } from '@store/index';
import { useThemeSync, type Theme } from '@hooks/useTheme';
import { MoonIcon, SunIcon } from '@components/formatter/icons';

const OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'auto', label: 'System' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggle(): JSX.Element {
  useThemeSync();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center rounded-md border border-border bg-surface p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = o.value === theme;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => setTheme(o.value)}
            className={
              'inline-flex h-7 items-center gap-1 rounded-[5px] px-2 text-xs transition-colors ' +
              (active ? 'bg-muted text-fg' : 'text-subtle hover:text-fg')
            }
          >
            {o.value === 'light' && <SunIcon className="h-3.5 w-3.5" />}
            {o.value === 'dark' && <MoonIcon className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
