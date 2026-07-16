import { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { SHORTCUTS } from '@lib/shortcuts';
import { SearchIcon } from './icons';

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  keys?: string;
  run: () => void;
  keywords?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}

export function CommandPalette({ open, onClose, commands }: Props): JSX.Element | null {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const withKeys = useMemo(() => {
    const keyMap = new Map(SHORTCUTS.map((s) => [s.id, s.keys]));
    return commands.map((c) => ({ ...c, keys: c.keys ?? keyMap.get(c.id) }));
  }, [commands]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return withKeys;
    return withKeys.filter((c) =>
      `${c.label} ${c.hint ?? ''} ${c.keywords ?? ''}`.toLowerCase().includes(q),
    );
  }, [withKeys, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!open) return null;

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[index];
      if (cmd) {
        cmd.run();
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh] backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
      onKeyDown={handleKey}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-elevated shadow-pop animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <SearchIcon className="h-4 w-4 text-subtle" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
            aria-label="Search commands"
          />
        </div>
        <ul role="listbox" className="max-h-72 overflow-auto py-1">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-subtle">No matching commands.</li>
          )}
          {filtered.map((cmd, i) => (
            <li
              key={cmd.id}
              role="option"
              aria-selected={i === index}
              onMouseEnter={() => setIndex(i)}
              onClick={() => {
                cmd.run();
                onClose();
              }}
              className={clsx(
                'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm',
                i === index ? 'bg-muted text-fg' : 'text-fg',
              )}
            >
              <div className="flex flex-col">
                <span>{cmd.label}</span>
                {cmd.hint && <span className="text-xs text-subtle">{cmd.hint}</span>}
              </div>
              {cmd.keys && <kbd>{cmd.keys}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element | null {
  if (!open) return null;
  const groups: Array<{ title: string; group: 'file' | 'edit' | 'view' | 'help' }> = [
    { title: 'File', group: 'file' },
    { title: 'Edit', group: 'edit' },
    { title: 'View', group: 'view' },
    { title: 'Help', group: 'help' },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-elevated shadow-pop animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close">×</button>
        </div>
        <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.group}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">{g.title}</h3>
              <ul className="space-y-1.5">
                {SHORTCUTS.filter((s) => s.group === g.group).map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-fg">{s.label}</span>
                    <kbd>{s.keys}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
