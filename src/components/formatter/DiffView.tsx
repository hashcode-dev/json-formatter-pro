import { FormattedView } from './FormattedView';

interface Props {
  original: string;
  modified: string;
}

export function DiffView({ original, modified }: Props): JSX.Element {
  return (
    <div className="grid h-full grid-cols-1 gap-px bg-border md:grid-cols-2">
      <section aria-label="Original" className="flex min-h-0 flex-col bg-surface">
        <header className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3 text-xs uppercase tracking-wide text-subtle">
          <span>Original</span>
          <span className="font-mono normal-case text-[10px]">{original.length} chars</span>
        </header>
        <div className="min-h-0 flex-1">
          <FormattedView
            value={original}
            ariaLabel="Original JSON input"
            emptyLabel="Paste JSON in the editor to see it here."
          />
        </div>
      </section>
      <section aria-label="Formatted" className="flex min-h-0 flex-col bg-surface">
        <header className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3 text-xs uppercase tracking-wide text-subtle">
          <span>Formatted</span>
          <span className="font-mono normal-case text-[10px]">{modified.length} chars</span>
        </header>
        <div className="min-h-0 flex-1">
          <FormattedView
            value={modified}
            ariaLabel="Formatted JSON output"
            emptyLabel="Formatted output will appear here."
          />
        </div>
      </section>
    </div>
  );
}
