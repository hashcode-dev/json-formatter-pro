import { useEffect } from 'react';
import { useStore } from '@store/index';

export type Theme = 'light' | 'dark' | 'auto';

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme !== 'auto') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useThemeSync(): void {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const apply = () => {
      const resolved = resolve(theme);
      document.documentElement.dataset.theme = resolved;
    };
    apply();

    // Only set up media query listener for auto theme
    if (theme !== 'auto' || typeof window === 'undefined') {
      return;
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => apply();
    mq.addEventListener('change', listener);

    // Clean up listener when theme changes
    return () => mq.removeEventListener('change', listener);
  }, [theme]);
}
