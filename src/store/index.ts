import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_FORMAT_OPTIONS } from '@lib/json/types';
import type { FormatOptions, JsonError, JsonStats, JsonValue } from '@lib/json/types';
import type { Theme } from '@hooks/useTheme';

export type OutputMode = 'formatted' | 'tree' | 'diff' | 'stats';
export type Status = 'idle' | 'parsing' | 'valid' | 'invalid';

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
  setOptions: (patch: Partial<FormatOptions>) => void;
  setTheme: (t: Theme) => void;
  togglePalette: (open?: boolean) => void;
  toggleHelp: (open?: boolean) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  clear: () => void;
}

const MAX_PERSISTED_INPUT = 512 * 1024; // 512 KB

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
      setMode: (m) => set({ mode: m }),
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
      name: 'json-formatter-pro',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        input: s.input.length <= MAX_PERSISTED_INPUT ? s.input : '',
        options: s.options,
        theme: s.theme,
        mode: s.mode,
      }),
    },
  ),
);

let toastCounter = 0;
function nextToastId(): number {
  toastCounter = (toastCounter + 1) % Number.MAX_SAFE_INTEGER;
  return toastCounter;
}
