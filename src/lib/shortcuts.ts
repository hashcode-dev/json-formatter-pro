export interface Shortcut {
  id: string;
  label: string;
  keys: string;         // human-readable, e.g. "⌘⏎"
  keyMatcher: (e: KeyboardEvent) => boolean;
  group: 'file' | 'edit' | 'view' | 'help';
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
export const modKey = isMac ? '⌘' : 'Ctrl';

const mod = (e: KeyboardEvent) => (isMac ? e.metaKey : e.ctrlKey);

export const SHORTCUTS: Shortcut[] = [
  { id: 'format', label: 'Format / Beautify', keys: `${modKey} ⏎`, group: 'edit',
    keyMatcher: (e) => mod(e) && e.key === 'Enter' },
  { id: 'minify', label: 'Minify', keys: `${modKey} ⇧ M`, group: 'edit',
    keyMatcher: (e) => mod(e) && e.shiftKey && (e.key === 'M' || e.key === 'm') },
  { id: 'copy', label: 'Copy output', keys: `${modKey} ⇧ C`, group: 'file',
    keyMatcher: (e) => mod(e) && e.shiftKey && (e.key === 'C' || e.key === 'c') },
  { id: 'download', label: 'Download', keys: `${modKey} ⇧ S`, group: 'file',
    keyMatcher: (e) => mod(e) && e.shiftKey && (e.key === 'S' || e.key === 's') },
  { id: 'clear', label: 'Clear editor', keys: `${modKey} ⇧ ⌫`, group: 'edit',
    keyMatcher: (e) => mod(e) && e.shiftKey && (e.key === 'Backspace' || e.key === 'Delete') },
  { id: 'palette', label: 'Command palette', keys: `${modKey} K`, group: 'view',
    keyMatcher: (e) => mod(e) && (e.key === 'k' || e.key === 'K') },
  { id: 'help', label: 'Keyboard shortcuts', keys: `${modKey} /`, group: 'help',
    keyMatcher: (e) => mod(e) && e.key === '/' },
  { id: 'tab-formatted', label: 'Show Formatted', keys: '1', group: 'view',
    keyMatcher: (e) => !mod(e) && !e.altKey && e.key === '1' && !isTypingTarget(e) },
  { id: 'tab-tree', label: 'Show Tree', keys: '2', group: 'view',
    keyMatcher: (e) => !mod(e) && !e.altKey && e.key === '2' && !isTypingTarget(e) },
  { id: 'tab-diff', label: 'Show Diff', keys: '3', group: 'view',
    keyMatcher: (e) => !mod(e) && !e.altKey && e.key === '3' && !isTypingTarget(e) },
  { id: 'tab-stats', label: 'Show Stats', keys: '4', group: 'view',
    keyMatcher: (e) => !mod(e) && !e.altKey && e.key === '4' && !isTypingTarget(e) },
];

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!t.closest('.cm-editor');
}
