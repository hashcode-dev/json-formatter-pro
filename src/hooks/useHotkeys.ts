import { useEffect } from 'react';
import { SHORTCUTS } from '@lib/shortcuts';

type Handler = (id: string, event: KeyboardEvent) => void;

export function useHotkeys(handler: Handler, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const listener = (e: KeyboardEvent) => {
      for (const s of SHORTCUTS) {
        if (s.keyMatcher(e)) {
          e.preventDefault();
          handler(s.id, e);
          return;
        }
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handler, enabled]);
}
