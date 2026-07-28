import type { ReactNode } from 'react';

/** Centred placeholder shown by output panes that have nothing to render yet. */
export function EmptyPane({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-subtle">
      {children}
    </div>
  );
}
