import { useEffect } from 'react';

export function useDebouncedEffect(effect: () => void | (() => void), deps: unknown[], delay: number): void {
  useEffect(() => {
    const handle = window.setTimeout(effect, delay);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
