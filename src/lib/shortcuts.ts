export interface Shortcut {
  id: string;
  label: string;
  keys: string;         // human-readable, e.g. "⌘⏎"
  keyMatcher: (e: KeyboardEvent) => boolean;
  group: 'file' | 'edit' | 'view' | 'help';
}

export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
export const modKey = isMac ? '⌘' : 'Ctrl';

const mod = (e: KeyboardEvent) => (isMac ? e.metaKey : e.ctrlKey);

/** Mod+Shift+<letter>, matching either case as the browser reports it. */
const modShift =
  (letter: string) =>
  (e: KeyboardEvent): boolean =>
    mod(e) && e.shiftKey && e.key.toLowerCase() === letter.toLowerCase();

/** A bare digit, ignored while the caret is in an editor or form field. */
const bareKey =
  (key: string) =>
  (e: KeyboardEvent): boolean =>
    !mod(e) && !e.altKey && e.key === key && !isTypingTarget(e);

export const SHORTCUTS: Shortcut[] = [
  { id: 'format', label: 'Format / Beautify', keys: `${modKey} ⏎`, group: 'edit',
    keyMatcher: (e) => mod(e) && e.key === 'Enter' },
  { id: 'minify', label: 'Minify', keys: `${modKey} ⇧ M`, group: 'edit',
    keyMatcher: modShift('m') },
  { id: 'copy', label: 'Copy output', keys: `${modKey} ⇧ C`, group: 'file',
    keyMatcher: modShift('c') },
  { id: 'download', label: 'Download', keys: `${modKey} ⇧ S`, group: 'file',
    keyMatcher: modShift('s') },
  { id: 'clear', label: 'Clear editor', keys: `${modKey} ⇧ ⌫`, group: 'edit',
    keyMatcher: (e) => mod(e) && e.shiftKey && (e.key === 'Backspace' || e.key === 'Delete') },
  { id: 'palette', label: 'Command palette', keys: `${modKey} K`, group: 'view',
    keyMatcher: (e) => mod(e) && e.key.toLowerCase() === 'k' },
  { id: 'help', label: 'Keyboard shortcuts', keys: `${modKey} /`, group: 'help',
    keyMatcher: (e) => mod(e) && e.key === '/' },
  { id: 'tab-formatted', label: 'Show Formatted', keys: '1', group: 'view',
    keyMatcher: bareKey('1') },
  { id: 'tab-tree', label: 'Show Tree', keys: '2', group: 'view',
    keyMatcher: bareKey('2') },
  { id: 'tab-stats', label: 'Show Stats', keys: '4', group: 'view',
    keyMatcher: bareKey('4') },
];

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!t.closest('.cm-editor');
}
