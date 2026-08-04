import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_FORMAT_OPTIONS } from '@lib/json/types';
import type { FormatOptions, JsonError, JsonStats, JsonValue } from '@lib/json/types';
import type { Theme } from '@hooks/useTheme';

export type CoreMode = 'formatted' | 'tree' | 'stats';
/**
 * `yaml`/`xml`/`csv` convert JSON *out*, as do the code generators
 * (`typescript`/`python`/`java`/`go`); `csvToJson`/`yamlToJson`/`xmlToJson` go
 * the other way, so their input pane holds the source format rather than JSON
 * (see src/components/formatter/input-formats.ts).
 */
export type ToolMode =
  | 'yaml' | 'xml' | 'csv' | 'typescript' | 'python' | 'java' | 'go' | 'schema' | 'jwt'
  | 'csvToJson' | 'yamlToJson' | 'xmlToJson';
export type OutputMode = CoreMode | ToolMode;
export type Status = 'idle' | 'parsing' | 'valid' | 'invalid';

/** Opt-in views: hidden until the user explicitly opens the tool. */
export const TOOL_MODES: readonly ToolMode[] = [
  'yaml', 'xml', 'csv', 'typescript', 'python', 'java', 'go', 'schema', 'jwt',
  'csvToJson', 'yamlToJson', 'xmlToJson',
];

export function isToolMode(m: OutputMode): m is ToolMode {
  return (TOOL_MODES as readonly string[]).includes(m);
}

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  message: string;
}

interface State {
  input: string;
  formatted: string;
  value: JsonValue | null;
  status: Status;
  error: JsonError | null;
  stats: JsonStats | null;
  mode: OutputMode;
  /**
   * The one tool tab on show, if any. Core views are always shown; picking a
   * tool replaces whichever tool was there before, so tabs never accumulate.
   */
  activeTool: ToolMode | null;
  options: FormatOptions;
  theme: Theme;
  paletteOpen: boolean;
  helpOpen: boolean;
  toasts: Toast[];

  setInput: (v: string) => void;
  setFormatted: (v: string) => void;
  setValue: (v: JsonValue | null) => void;
  setStatus: (s: Status) => void;
  setError: (e: JsonError | null) => void;
  setStats: (s: JsonStats | null) => void;
  setMode: (m: OutputMode) => void;
  initMode: (m: OutputMode) => void;
  closeTool: () => void;
  setOptions: (patch: Partial<FormatOptions>) => void;
  setTheme: (t: Theme) => void;
  togglePalette: (open?: boolean) => void;
  toggleHelp: (open?: boolean) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  clear: () => void;
}

const MAX_PERSISTED_INPUT = 512 * 1024; // 512 KB

/**
 * localStorage key for the persisted store. BaseLayout's pre-hydration theme
 * script reads it directly (it cannot import this module), so the two must agree.
 */
export const STORE_KEY = 'json-formatter-pro';

export const useStore = create<State>()(
  persist(
    (set) => ({
      input: '',
      formatted: '',
      value: null,
      status: 'idle',
      error: null,
      stats: null,
      mode: 'formatted',
      activeTool: null,
      options: DEFAULT_FORMAT_OPTIONS,
      theme: 'auto',
      paletteOpen: false,
      helpOpen: false,
      toasts: [],

      setInput: (v) => set({ input: v }),
      setFormatted: (v) => set({ formatted: v }),
      setValue: (v) => set({ value: v }),
      setStatus: (s) => set({ status: s }),
      setError: (e) => set({ error: e }),
      setStats: (s) => set({ stats: s }),
      // Picking a tool swaps it in for the previous one. Core views leave the
      // tool tab alone, so switching to Formatted and back stays possible.
      setMode: (m) => set((s) => ({ mode: m, activeTool: isToolMode(m) ? m : s.activeTool })),
      // A page declaring its own view wins outright, so a tool tab left over
      // from the last session never bleeds onto a core-view page.
      initMode: (m) => set({ mode: m, activeTool: isToolMode(m) ? m : null }),
      closeTool: () =>
        set((s) => ({
          activeTool: null,
          mode: isToolMode(s.mode) ? 'formatted' : s.mode,
        })),
      setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
      setTheme: (t) => set({ theme: t }),
      togglePalette: (open) => set((s) => ({ paletteOpen: open ?? !s.paletteOpen })),
      toggleHelp: (open) => set((s) => ({ helpOpen: open ?? !s.helpOpen })),
      pushToast: (t) =>
        set((s) => ({ toasts: [...s.toasts, { ...t, id: nextToastId() }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      clear: () =>
        set({
          input: '', formatted: '', value: null,
          status: 'idle', error: null, stats: null,
        }),
    }),
    {
      name: STORE_KEY,
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // Neither `mode` nor `activeTool` is persisted: every page declares its
      // own view via `initMode`, so a load always starts on that page's default
      // with no tool tab carried over from a previous visit.
      partialize: (s) => ({
        input: s.input.length <= MAX_PERSISTED_INPUT ? s.input : '',
        options: s.options,
        theme: s.theme,
      }),
      // v1 persisted `mode`; drop it so old entries can't restore a stale view.
      // v2 → v3 added `options.spec`; backfill from defaults so older entries
      // hydrate with a valid spec instead of `undefined`.
      migrate: (persisted) => {
        const { mode: _mode, ...rest } = (persisted ?? {}) as Record<string, unknown>;
        const restTyped = rest as Partial<State>;
        return {
          ...restTyped,
          options: { ...DEFAULT_FORMAT_OPTIONS, ...(restTyped.options ?? {}) },
        } as Partial<State>;
      },
    },
  ),
);

let toastCounter = 0;
function nextToastId(): number {
  return ++toastCounter;
}
